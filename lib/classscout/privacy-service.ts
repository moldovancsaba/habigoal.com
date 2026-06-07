import type { ClassScoutServiceResult, HouseholdProfileExport } from "./contracts";

export type ConsentStatus = "active" | "withdrawn" | "expired";
export type ConsentType = "child_profile_personalization";
export type DeletionTargetType = "profile" | "household";
export type DeletionRequestStatus = "requested" | "processing" | "completed" | "failed";
export type ExportRequestStatus = "requested" | "processing" | "ready" | "failed";

export type ConsentRecord = {
  id: string;
  householdId: string;
  profileId: string;
  consentType: ConsentType;
  noticeVersion: string;
  status: ConsentStatus;
  grantedAt: string;
  withdrawnAt?: string;
  actorUserId: string;
};

export type DeletionRequest = {
  id: string;
  householdId: string;
  targetType: DeletionTargetType;
  targetId: string;
  status: DeletionRequestStatus;
  requestedAt: string;
  completedAt?: string;
  failureCode?: string;
  attempts: number;
};

export type ExportRequest = {
  id: string;
  householdId: string;
  status: ExportRequestStatus;
  requestedAt: string;
  completedAt?: string;
  failureCode?: string;
  attempts: number;
  exportData?: HouseholdProfileExport;
};

export type ConsentInput = {
  householdId: string;
  profileId: string;
  actorUserId: string;
  noticeVersion: string;
};

export type DeletionRequestInput = {
  householdId: string;
  targetType: DeletionTargetType;
  targetId: string;
};

export type PrivacyAuditEvent = {
  capability: "classscout.consent" | "classscout.export" | "classscout.delete";
  action: string;
  status: "success" | "failure" | "retry" | "timeout" | "rollback_recovered";
  householdId?: string;
  profileId?: string;
  requestId?: string;
  reasonCode?: string;
  runId: string;
  createdAt: string;
};

export type ClassScoutPrivacyRepository = {
  saveConsent(record: ConsentRecord): Promise<ConsentRecord>;
  findActiveConsent(householdId: string, profileId: string, consentType: ConsentType): Promise<ConsentRecord | null>;
  findConsent(id: string): Promise<ConsentRecord | null>;
  saveDeletionRequest(request: DeletionRequest): Promise<DeletionRequest>;
  findDeletionRequest(householdId: string, targetType: DeletionTargetType, targetId: string): Promise<DeletionRequest | null>;
  saveExportRequest(request: ExportRequest): Promise<ExportRequest>;
  findExportRequest(householdId: string): Promise<ExportRequest | null>;
};

export class InMemoryClassScoutPrivacyRepository implements ClassScoutPrivacyRepository {
  private consentRecords = new Map<string, ConsentRecord>();
  private deletionRequests = new Map<string, DeletionRequest>();
  private exportRequests = new Map<string, ExportRequest>();

  async saveConsent(record: ConsentRecord): Promise<ConsentRecord> {
    this.consentRecords.set(record.id, record);
    return record;
  }

  async findActiveConsent(householdId: string, profileId: string, consentType: ConsentType): Promise<ConsentRecord | null> {
    return (
      [...this.consentRecords.values()].find(
        (record) =>
          record.householdId === householdId &&
          record.profileId === profileId &&
          record.consentType === consentType &&
          record.status === "active"
      ) ?? null
    );
  }

  async findConsent(id: string): Promise<ConsentRecord | null> {
    return this.consentRecords.get(id) ?? null;
  }

  async saveDeletionRequest(request: DeletionRequest): Promise<DeletionRequest> {
    this.deletionRequests.set(deletionKey(request.householdId, request.targetType, request.targetId), request);
    return request;
  }

  async findDeletionRequest(householdId: string, targetType: DeletionTargetType, targetId: string): Promise<DeletionRequest | null> {
    return this.deletionRequests.get(deletionKey(householdId, targetType, targetId)) ?? null;
  }

  async saveExportRequest(request: ExportRequest): Promise<ExportRequest> {
    this.exportRequests.set(request.householdId, request);
    return request;
  }

  async findExportRequest(householdId: string): Promise<ExportRequest | null> {
    return this.exportRequests.get(householdId) ?? null;
  }
}

export type ClassScoutPrivacyServiceOptions = {
  repository: ClassScoutPrivacyRepository;
  now?: () => Date;
  createId?: () => string;
  audit?: (event: PrivacyAuditEvent) => void;
};

export class ClassScoutPrivacyService {
  private repository: ClassScoutPrivacyRepository;
  private now: () => Date;
  private createId: () => string;
  private audit: (event: PrivacyAuditEvent) => void;

  constructor(options: ClassScoutPrivacyServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.audit = options.audit ?? (() => undefined);
  }

  async grantChildProfileConsent(input: ConsentInput): Promise<ClassScoutServiceResult<ConsentRecord>> {
    const normalized = normalizeConsentInput(input);
    if (!normalized.ok) {
      this.emit("classscout.consent", "grant", "failure", input.householdId, input.profileId, undefined, normalized.error.code);
      return normalized;
    }

    const existing = await this.repository.findActiveConsent(
      normalized.data.householdId,
      normalized.data.profileId,
      "child_profile_personalization"
    );
    if (existing?.noticeVersion === normalized.data.noticeVersion) {
      this.emit("classscout.consent", "grant", "success", existing.householdId, existing.profileId, existing.id);
      return success(existing);
    }

    const record: ConsentRecord = {
      id: this.createId(),
      ...normalized.data,
      consentType: "child_profile_personalization",
      status: "active",
      grantedAt: this.timestamp()
    };
    const saved = await this.repository.saveConsent(record);
    this.emit("classscout.consent", "grant", "success", saved.householdId, saved.profileId, saved.id);
    return success(saved);
  }

  async withdrawConsent(consentId: string, householdId: string, actorUserId: string): Promise<ClassScoutServiceResult<ConsentRecord>> {
    const record = await this.repository.findConsent(consentId);
    if (!record) {
      return failure("CONSENT_NOT_FOUND", "Consent record was not found.", false, "empty");
    }
    if (record.householdId !== normalizeText(householdId) || record.actorUserId !== normalizeText(actorUserId)) {
      this.emit("classscout.consent", "withdraw", "failure", householdId, record.profileId, record.id, "CONSENT_SCOPE_DENIED");
      return failure("CONSENT_SCOPE_DENIED", "Consent record does not belong to this parent scope.", false, "permission_denied");
    }
    if (record.status === "withdrawn") {
      return success(record);
    }

    const withdrawn: ConsentRecord = { ...record, status: "withdrawn", withdrawnAt: this.timestamp() };
    const saved = await this.repository.saveConsent(withdrawn);
    this.emit("classscout.consent", "withdraw", "success", saved.householdId, saved.profileId, saved.id);
    return success(saved);
  }

  async requireRecommendationConsent(householdId: string, profileId: string): Promise<ClassScoutServiceResult<ConsentRecord>> {
    const consent = await this.repository.findActiveConsent(normalizeText(householdId), normalizeText(profileId), "child_profile_personalization");
    if (!consent) {
      this.emit("classscout.consent", "recommendation_gate", "failure", householdId, profileId, undefined, "CONSENT_REQUIRED");
      return failure("CONSENT_REQUIRED", "Active parent consent is required before recommendations can use this profile.", false, "permission_denied");
    }
    return success(consent);
  }

  async requestDeletion(input: DeletionRequestInput): Promise<ClassScoutServiceResult<DeletionRequest>> {
    const householdId = normalizeText(input.householdId);
    const targetId = normalizeText(input.targetId);
    if (!householdId || !targetId) {
      return failure("DELETE_SCOPE_REQUIRED", "Deletion request requires household and target scope.", false, "validation_error");
    }

    const existing = await this.repository.findDeletionRequest(householdId, input.targetType, targetId);
    if (existing && existing.status !== "failed") {
      this.emit("classscout.delete", "request", "success", householdId, undefined, existing.id);
      return success(existing);
    }

    const request: DeletionRequest = {
      id: existing?.id ?? this.createId(),
      householdId,
      targetType: input.targetType,
      targetId,
      status: "requested",
      requestedAt: this.timestamp(),
      attempts: existing?.attempts ?? 0
    };
    const saved = await this.repository.saveDeletionRequest(request);
    this.emit("classscout.delete", "request", "success", householdId, undefined, saved.id);
    return success(saved);
  }

  async markDeletionCompleted(request: DeletionRequest): Promise<ClassScoutServiceResult<DeletionRequest>> {
    const saved = await this.repository.saveDeletionRequest({ ...request, status: "completed", completedAt: this.timestamp(), failureCode: undefined });
    this.emit("classscout.delete", "complete", "success", saved.householdId, undefined, saved.id);
    return success(saved);
  }

  async markDeletionFailed(request: DeletionRequest, failureCode: string): Promise<ClassScoutServiceResult<DeletionRequest>> {
    const saved = await this.repository.saveDeletionRequest({ ...request, status: "failed", failureCode: normalizeText(failureCode), attempts: request.attempts + 1 });
    this.emit("classscout.delete", "fail", "failure", saved.householdId, undefined, saved.id, saved.failureCode);
    return success(saved);
  }

  async requestExport(householdId: string, buildExport: () => Promise<HouseholdProfileExport>): Promise<ClassScoutServiceResult<ExportRequest>> {
    const normalizedHouseholdId = normalizeText(householdId);
    if (!normalizedHouseholdId) {
      return failure("EXPORT_SCOPE_REQUIRED", "Export requires household scope.", false, "validation_error");
    }

    const existing = await this.repository.findExportRequest(normalizedHouseholdId);
    if (existing?.status === "ready") {
      return success(existing);
    }

    const request: ExportRequest = {
      id: existing?.id ?? this.createId(),
      householdId: normalizedHouseholdId,
      status: "processing",
      requestedAt: existing?.requestedAt ?? this.timestamp(),
      attempts: (existing?.attempts ?? 0) + 1
    };
    await this.repository.saveExportRequest(request);

    try {
      const exportData = await buildExport();
      const ready = await this.repository.saveExportRequest({ ...request, status: "ready", exportData, completedAt: this.timestamp() });
      this.emit("classscout.export", "request", "success", normalizedHouseholdId, undefined, ready.id);
      return success(ready);
    } catch {
      const failed = await this.repository.saveExportRequest({ ...request, status: "failed", failureCode: "EXPORT_BUILD_FAILED" });
      this.emit("classscout.export", "request", "failure", normalizedHouseholdId, undefined, failed.id, failed.failureCode);
      return failure("EXPORT_BUILD_FAILED", "Export generation failed and can be retried.", true, "retry_available");
    }
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private emit(
    capability: PrivacyAuditEvent["capability"],
    action: string,
    status: PrivacyAuditEvent["status"],
    householdId?: string,
    profileId?: string,
    requestId?: string,
    reasonCode?: string
  ) {
    this.audit({ capability, action, status, householdId, profileId, requestId, reasonCode, runId: this.createId(), createdAt: this.timestamp() });
  }
}

function normalizeConsentInput(input: ConsentInput): ClassScoutServiceResult<ConsentInput> {
  const householdId = normalizeText(input.householdId);
  const profileId = normalizeText(input.profileId);
  const actorUserId = normalizeText(input.actorUserId);
  const noticeVersion = normalizeText(input.noticeVersion);

  if (!householdId || !profileId || !actorUserId || !noticeVersion) {
    return failure("CONSENT_SCOPE_REQUIRED", "Consent requires household, profile, actor, and notice version.", false, "validation_error");
  }

  return success({ householdId, profileId, actorUserId, noticeVersion });
}

function deletionKey(householdId: string, targetType: DeletionTargetType, targetId: string): string {
  return `${householdId}:${targetType}:${targetId}`;
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
