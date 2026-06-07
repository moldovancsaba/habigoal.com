import type {
  ChildActivityProfile,
  ChildActivityProfileInput,
  ClassScoutServiceResult,
  HouseholdPreference,
  HouseholdPreferenceInput,
  HouseholdProfileExport,
  RedactedChildActivityProfile
} from "./contracts";

const MAX_LIST_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 1_500;

export type ClassScoutAuditEvent = {
  capability: "classscout.profile" | "classscout.preference" | "classscout.privacy";
  action: string;
  status: "success" | "failure" | "retry" | "timeout" | "rollback_recovered";
  householdId?: string;
  profileId?: string;
  reasonCode?: string;
  runId: string;
  createdAt: string;
};

export type ClassScoutProfileRepository = {
  create(profile: ChildActivityProfile): Promise<ChildActivityProfile>;
  update(profile: ChildActivityProfile): Promise<ChildActivityProfile>;
  listByHousehold(householdId: string): Promise<ChildActivityProfile[]>;
  findById(id: string): Promise<ChildActivityProfile | null>;
  savePreferences(preferences: HouseholdPreference): Promise<HouseholdPreference>;
  getPreferences(householdId: string): Promise<HouseholdPreference | null>;
};

export type ClassScoutProfileServiceOptions = {
  repository: ClassScoutProfileRepository;
  now?: () => Date;
  createId?: () => string;
  audit?: (event: ClassScoutAuditEvent) => void;
  timeoutMs?: number;
};

export class InMemoryClassScoutProfileRepository implements ClassScoutProfileRepository {
  private profiles = new Map<string, ChildActivityProfile>();
  private preferences = new Map<string, HouseholdPreference>();

  async create(profile: ChildActivityProfile): Promise<ChildActivityProfile> {
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async update(profile: ChildActivityProfile): Promise<ChildActivityProfile> {
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async listByHousehold(householdId: string): Promise<ChildActivityProfile[]> {
    return [...this.profiles.values()].filter((profile) => profile.householdId === householdId && !profile.deletedAt);
  }

  async findById(id: string): Promise<ChildActivityProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async savePreferences(preferences: HouseholdPreference): Promise<HouseholdPreference> {
    this.preferences.set(preferences.householdId, preferences);
    return preferences;
  }

  async getPreferences(householdId: string): Promise<HouseholdPreference | null> {
    return this.preferences.get(householdId) ?? null;
  }
}

export class ClassScoutProfileService {
  private repository: ClassScoutProfileRepository;
  private now: () => Date;
  private createId: () => string;
  private audit: (event: ClassScoutAuditEvent) => void;
  private timeoutMs: number;

  constructor(options: ClassScoutProfileServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.audit = options.audit ?? (() => undefined);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async createChildProfile(input: ChildActivityProfileInput): Promise<ClassScoutServiceResult<RedactedChildActivityProfile>> {
    const normalized = normalizeProfileInput(input, this.timestamp());
    if (!normalized.ok) {
      this.emit("classscout.profile", "create", "failure", input.householdId, undefined, normalized.error.code);
      return normalized;
    }

    const profile: ChildActivityProfile = {
      id: this.createId(),
      ...normalized.data,
      createdAt: this.timestamp(),
      updatedAt: this.timestamp()
    };

    const saved = await this.withTimeout(() => this.repository.create(profile), "PROFILE_CREATE_TIMEOUT");
    if (!saved.ok) {
      this.emit("classscout.profile", "create", saved.state === "timeout" ? "timeout" : "failure", profile.householdId, profile.id, saved.error.code);
      return saved;
    }

    this.emit("classscout.profile", "create", "success", profile.householdId, profile.id);
    return success(redactProfile(saved.data));
  }

  async updateChildProfile(id: string, input: ChildActivityProfileInput): Promise<ClassScoutServiceResult<RedactedChildActivityProfile>> {
    const existing = await this.repository.findById(id);
    if (!existing || existing.deletedAt) {
      return failure("PROFILE_NOT_FOUND", "Profile was not found or is already deleted.", false, "empty");
    }

    if (existing.householdId !== input.householdId) {
      this.emit("classscout.profile", "update", "failure", input.householdId, id, "HOUSEHOLD_SCOPE_DENIED");
      return failure("HOUSEHOLD_SCOPE_DENIED", "Profile does not belong to the household.", false, "permission_denied");
    }

    const normalized = normalizeProfileInput(input, this.timestamp());
    if (!normalized.ok) {
      this.emit("classscout.profile", "update", "failure", input.householdId, id, normalized.error.code);
      return normalized;
    }

    const updated: ChildActivityProfile = { ...existing, ...normalized.data, updatedAt: this.timestamp() };
    const saved = await this.withTimeout(() => this.repository.update(updated), "PROFILE_UPDATE_TIMEOUT");
    if (!saved.ok) {
      this.emit("classscout.profile", "update", saved.state === "timeout" ? "timeout" : "failure", input.householdId, id, saved.error.code);
      return saved;
    }

    this.emit("classscout.profile", "update", "success", input.householdId, id);
    return success(redactProfile(saved.data));
  }

  async listHouseholdProfiles(householdId: string): Promise<ClassScoutServiceResult<RedactedChildActivityProfile[]>> {
    const scopedHouseholdId = normalizeText(householdId);
    if (!scopedHouseholdId) {
      return failure("HOUSEHOLD_REQUIRED", "Household scope is required.", false, "validation_error");
    }

    for (let attempt = 0; attempt <= MAX_LIST_RETRIES; attempt += 1) {
      const result = await this.withTimeout(() => this.repository.listByHousehold(scopedHouseholdId), "PROFILE_LIST_TIMEOUT");
      if (result.ok) {
        this.emit("classscout.profile", "list", "success", scopedHouseholdId);
        return success(result.data.map(redactProfile));
      }

      this.emit("classscout.profile", "list", attempt < MAX_LIST_RETRIES ? "retry" : "failure", scopedHouseholdId, undefined, result.error.code);
    }

    return failure("PROFILE_LIST_FAILED", "Profiles could not be loaded after bounded retries.", true, "retry_available");
  }

  async updateHouseholdPreferences(input: HouseholdPreferenceInput): Promise<ClassScoutServiceResult<HouseholdPreference>> {
    const householdId = normalizeText(input.householdId);
    if (!householdId) {
      return failure("HOUSEHOLD_REQUIRED", "Household scope is required.", false, "validation_error");
    }

    const preferences: HouseholdPreference = {
      ...input,
      householdId,
      travelModes: normalizeList(input.travelModes),
      includeNeighborhoods: normalizeList(input.includeNeighborhoods),
      excludeNeighborhoods: normalizeList(input.excludeNeighborhoods),
      formatPreferences: normalizeList(input.formatPreferences),
      updatedAt: this.timestamp()
    };

    const saved = await this.withTimeout(() => this.repository.savePreferences(preferences), "PREFERENCE_UPDATE_TIMEOUT");
    if (!saved.ok) {
      this.emit("classscout.preference", "update", saved.state === "timeout" ? "timeout" : "failure", householdId, undefined, saved.error.code);
      return saved;
    }

    this.emit("classscout.preference", "update", "success", householdId);
    return success(saved.data);
  }

  async exportHouseholdProfile(householdId: string): Promise<ClassScoutServiceResult<HouseholdProfileExport>> {
    const profiles = await this.listHouseholdProfiles(householdId);
    if (!profiles.ok) {
      return profiles;
    }

    const preferences = await this.repository.getPreferences(householdId);
    this.emit("classscout.privacy", "export", "success", householdId);
    return success({ householdId, profiles: profiles.data, preferences: preferences ?? undefined, exportedAt: this.timestamp() });
  }

  async requestProfileDeletion(id: string, householdId: string): Promise<ClassScoutServiceResult<RedactedChildActivityProfile>> {
    const profile = await this.repository.findById(id);
    if (!profile || profile.deletedAt) {
      return failure("PROFILE_NOT_FOUND", "Profile was not found or is already deleted.", false, "empty");
    }

    if (profile.householdId !== householdId) {
      this.emit("classscout.privacy", "delete", "failure", householdId, id, "HOUSEHOLD_SCOPE_DENIED");
      return failure("HOUSEHOLD_SCOPE_DENIED", "Profile does not belong to the household.", false, "permission_denied");
    }

    const deleted = { ...profile, deletedAt: this.timestamp(), updatedAt: this.timestamp() };
    const saved = await this.withTimeout(() => this.repository.update(deleted), "PROFILE_DELETE_TIMEOUT");
    if (!saved.ok) {
      this.emit("classscout.privacy", "delete", saved.state === "timeout" ? "timeout" : "failure", householdId, id, saved.error.code);
      return saved;
    }

    this.emit("classscout.privacy", "delete", "success", householdId, id);
    return { ok: true, data: redactProfile(saved.data), state: "deletion_pending", error: null };
  }

  private async withTimeout<T>(work: () => Promise<T>, code: string): Promise<ClassScoutServiceResult<T>> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<ClassScoutServiceResult<T>>((resolve) => {
      timeout = setTimeout(() => resolve(failure(code, "Operation timed out.", true, "timeout")), this.timeoutMs);
    });

    const workPromise = work()
      .then((data) => success(data))
      .catch(() => failure("SYSTEM_ERROR", "Operation failed.", true, "system_error"));

    const result = await Promise.race([workPromise, timeoutPromise]);
    if (timeout) {
      clearTimeout(timeout);
    }
    return result;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private emit(
    capability: ClassScoutAuditEvent["capability"],
    action: string,
    status: ClassScoutAuditEvent["status"],
    householdId?: string,
    profileId?: string,
    reasonCode?: string
  ) {
    this.audit({ capability, action, status, householdId, profileId, reasonCode, runId: this.createId(), createdAt: this.timestamp() });
  }
}

export function redactProfile(profile: ChildActivityProfile): RedactedChildActivityProfile {
  const { supportNotes, ...publicProfile } = profile;
  return { ...publicProfile, hasSupportNotes: Boolean(supportNotes?.value) };
}

function normalizeProfileInput(input: ChildActivityProfileInput, now: string): ClassScoutServiceResult<Omit<ChildActivityProfile, "id" | "createdAt" | "updatedAt" | "deletedAt">> {
  const householdId = normalizeText(input.householdId);
  const nickname = normalizeText(input.nickname);

  if (!householdId) {
    return failure("HOUSEHOLD_REQUIRED", "Household scope is required.", false, "validation_error");
  }
  if (!nickname) {
    return failure("NICKNAME_REQUIRED", "Child nickname is required.", false, "validation_error");
  }

  const supportNotesValue = normalizeText(input.supportNotes ?? "");

  return success({
    householdId,
    nickname,
    ageBand: input.ageBand,
    gradeBand: input.gradeBand,
    neighborhoodPreference: normalizeOptional(input.neighborhoodPreference),
    interests: normalizeList(input.interests ?? []),
    constraints: [...new Set(input.constraints ?? [])],
    experienceSignals: normalizeSignals(input.experienceSignals ?? {}),
    supportNotes: supportNotesValue ? { value: supportNotesValue, updatedAt: now, access: "parent_only" } : undefined
  });
}

function normalizeSignals(signals: ChildActivityProfile["experienceSignals"]): ChildActivityProfile["experienceSignals"] {
  return Object.fromEntries(
    Object.entries(signals)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)
      .map(([key, value]) => [key, Math.floor(value as number)])
  ) as ChildActivityProfile["experienceSignals"];
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = normalizeText(value ?? "");
  return normalized || undefined;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function success<T>(data: T): ClassScoutServiceResult<T> {
  return { ok: true, data, state: "success", error: null };
}

function failure<T>(code: string, message: string, retryable: boolean, state: ClassScoutServiceResult<T>["state"]): ClassScoutServiceResult<T> {
  return { ok: false, data: null, state, error: { code, message, retryable } };
}
