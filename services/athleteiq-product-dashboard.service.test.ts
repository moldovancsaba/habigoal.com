import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthUser, resolveAccessibleAthleteIds, type AuthUser } from "@/lib/access";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { listPainAlertsByAthlete } from "@/repositories/athleteiq-pain-safety.repository";
import { listCoachActionsByDate } from "@/repositories/coach-actions.repository";
import { listChildrenWithMetrics, type ChildProfile } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { listTeams } from "@/repositories/team.repository";
import { getAthleteIqProductDashboardProjection } from "@/services/athleteiq-product-dashboard.service";
import type { CoachActionRecord } from "@/types/coach-action";
import type { Team } from "@/types/team";

vi.mock("@/lib/access", () => ({
  getAuthUser: vi.fn(),
  resolveAccessibleAthleteIds: vi.fn()
}));

vi.mock("@/repositories/athleteiq-daily-plan.repository", () => ({
  getDailyPlanByDate: vi.fn()
}));

vi.mock("@/repositories/athleteiq-daily-iq.repository", () => ({
  getLatestDailyIqSnapshot: vi.fn()
}));

vi.mock("@/repositories/athleteiq-check-in.repository", () => ({
  getAthleteIqCheckInSnapshot: vi.fn()
}));

vi.mock("@/repositories/athleteiq-pain-safety.repository", () => ({
  listPainAlertsByAthlete: vi.fn()
}));

vi.mock("@/repositories/coach-actions.repository", () => ({
  listCoachActionsByDate: vi.fn()
}));

vi.mock("@/repositories/child.repository", () => ({
  listChildrenWithMetrics: vi.fn()
}));

vi.mock("@/repositories/habit-records.repository", () => ({
  getHabitRecordByAthleteIdAndDate: vi.fn()
}));

vi.mock("@/repositories/team.repository", () => ({
  listTeams: vi.fn()
}));

const mockedGetAuthUser = vi.mocked(getAuthUser);
const mockedResolveAccessibleAthleteIds = vi.mocked(resolveAccessibleAthleteIds);
const mockedGetDailyPlanByDate = vi.mocked(getDailyPlanByDate);
const mockedGetLatestDailyIqSnapshot = vi.mocked(getLatestDailyIqSnapshot);
const mockedGetAthleteIqCheckInSnapshot = vi.mocked(getAthleteIqCheckInSnapshot);
const mockedListPainAlertsByAthlete = vi.mocked(listPainAlertsByAthlete);
const mockedGetHabitRecordByAthleteIdAndDate = vi.mocked(getHabitRecordByAthleteIdAndDate);
const mockedListCoachActionsByDate = vi.mocked(listCoachActionsByDate);
const mockedListChildrenWithMetrics = vi.mocked(listChildrenWithMetrics);
const mockedListTeams = vi.mocked(listTeams);

describe("Athlete IQ dashboard access scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthUser.mockResolvedValue(null);
    mockedResolveAccessibleAthleteIds.mockResolvedValue([]);
    mockedListChildrenWithMetrics.mockResolvedValue([]);
    mockedListTeams.mockResolvedValue([]);
    mockedListCoachActionsByDate.mockResolvedValue([]);
    mockedGetLatestDailyIqSnapshot.mockResolvedValue(null);
    mockedGetAthleteIqCheckInSnapshot.mockResolvedValue(null);
    mockedGetDailyPlanByDate.mockResolvedValue(null);
    mockedGetHabitRecordByAthleteIdAndDate.mockResolvedValue(null);
    mockedListPainAlertsByAthlete.mockResolvedValue([]);
  });

  it("returns an empty projection without reading live records when there is no authenticated user", async () => {
    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(projection).toMatchObject({
      state: "empty",
      athleteCount: 0,
      teamCount: 0,
      openActionCount: 0,
      activeQueue: [],
      athletes: [],
      operations: [],
      services: []
    });
    expect(mockedListChildrenWithMetrics).not.toHaveBeenCalled();
    expect(mockedListTeams).not.toHaveBeenCalled();
    expect(mockedListCoachActionsByDate).not.toHaveBeenCalled();
  });

  it("does not expose shared Athlete IQ data to a new trainer with no team relationship", async () => {
    mockedGetAuthUser.mockResolvedValue(trainerUser("new-coach@example.com"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue([]);
    mockedListChildrenWithMetrics.mockResolvedValue([athlete("athlete-1", "Existing Athlete")]);
    mockedListTeams.mockResolvedValue([team("team-1", ["other-coach@example.com"], ["athlete-1"])]);
    mockedListCoachActionsByDate.mockResolvedValue([coachAction("athlete-1")]);

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(projection.state).toBe("empty");
    expect(projection.athleteCount).toBe(0);
    expect(projection.teamCount).toBe(0);
    expect(projection.openActionCount).toBe(0);
    expect(projection.activeQueue).toEqual([]);
    expect(projection.athletes).toEqual([]);
    expect(projection.operations).toEqual([]);
    expect(projection.services).toEqual([]);
    expect(mockedGetLatestDailyIqSnapshot).not.toHaveBeenCalled();
    expect(mockedGetDailyPlanByDate).not.toHaveBeenCalled();
    expect(mockedListPainAlertsByAthlete).not.toHaveBeenCalled();
  });

  it("shows only athletes and actions connected to the trainer scope", async () => {
    mockedGetAuthUser.mockResolvedValue(trainerUser("coach@example.com"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue(["athlete-1"]);
    mockedListChildrenWithMetrics.mockResolvedValue([
      athlete("athlete-1", "Assigned Athlete"),
      athlete("athlete-2", "Other Athlete")
    ]);
    mockedListTeams.mockResolvedValue([
      team("team-1", ["coach@example.com"], ["athlete-1"]),
      team("team-2", ["other-coach@example.com"], ["athlete-2"])
    ]);
    mockedListCoachActionsByDate.mockResolvedValue([coachAction("athlete-1"), coachAction("athlete-2")]);
    mockedGetLatestDailyIqSnapshot.mockImplementation(async (input) =>
      input.athleteId === "athlete-1"
        ? ({
            dailyIqScore: 72,
            mentalEdgeScore: 80,
            safeLoadScore: 66
          } as Awaited<ReturnType<typeof getLatestDailyIqSnapshot>>)
        : null
    );
    mockedGetDailyPlanByDate.mockResolvedValue({ id: "plan-1" } as Awaited<ReturnType<typeof getDailyPlanByDate>>);

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(projection.state).toBe("ready");
    expect(projection.athleteCount).toBe(1);
    expect(projection.teamCount).toBe(1);
    expect(projection.openActionCount).toBe(1);
    expect(projection.athletes.map((row) => row.id)).toEqual(["athlete-1"]);
    expect(projection.activeQueue.map((row) => row.id)).toEqual(["athlete-1"]);
    expect(mockedGetLatestDailyIqSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedGetLatestDailyIqSnapshot).toHaveBeenCalledWith({ athleteId: "athlete-1", localDate: "2026-06-27" });
    expect(mockedListPainAlertsByAthlete).toHaveBeenCalledWith("athlete-1");
    expect(projection.athletes[0].habigoalDaily.completionState).toBe("missing");
  });

  it("uses performance-only check-ins as Habigoal daily source for older records", async () => {
    mockedGetAuthUser.mockResolvedValue(trainerUser("coach@example.com"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue(["athlete-1"]);
    mockedListChildrenWithMetrics.mockResolvedValue([
      {
        ...athlete("athlete-1", "Assigned Athlete"),
        latestReadiness: undefined,
        latestScores: undefined
      }
    ]);
    mockedListTeams.mockResolvedValue([team("team-1", ["coach@example.com"], ["athlete-1"])]);
    mockedGetAthleteIqCheckInSnapshot.mockImplementation(async (_athleteId, _localDate, mode) =>
      mode === "performance"
        ? ({
            athleteId: "athlete-1",
            localDate: "2026-06-27",
            mode: "performance",
            timezone: "Europe/Budapest",
            values: {
              fatigue: { rawValue: 3, normalizedValue: 22, sourceLabel: "user_input" },
              mood: { rawValue: 8, normalizedValue: 78, sourceLabel: "user_input" },
              pain: { rawValue: 2, normalizedValue: 11, sourceLabel: "user_input" },
              sleepQuality: { rawValue: 7, normalizedValue: 67, sourceLabel: "user_input" }
            },
            missingFields: [],
            sourceLabels: {},
            submittedAt: "2026-06-27T08:00:00.000Z",
            updatedAt: "2026-06-27T08:00:00.000Z",
            auditHistory: []
          } as Awaited<ReturnType<typeof getAthleteIqCheckInSnapshot>>)
        : null
    );

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(mockedGetAthleteIqCheckInSnapshot.mock.calls.map((call) => call[2])).toEqual(["lifestyle", "performance"]);
    expect(projection.athletes[0].habigoalDaily.completionState).toBe("complete");
    expect(projection.athletes[0].habigoalDaily.status).toBe("balanced");
    expect(projection.athletes[0].readiness).not.toBeNull();
    expect(projection.missingData).not.toContain("dailyStatus");
  });

  it("keeps Athlete IQ in athlete persona when the active session role is athlete", async () => {
    mockedGetAuthUser.mockResolvedValue(athleteUser("athlete@example.com", "athlete-1"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue(["athlete-1"]);
    mockedListChildrenWithMetrics.mockResolvedValue([
      athlete("athlete-1", "Active Athlete"),
      athlete("athlete-2", "Other Athlete")
    ]);
    mockedListTeams.mockResolvedValue([
      team("team-1", ["coach@example.com"], ["athlete-1", "athlete-2"])
    ]);
    mockedListCoachActionsByDate.mockResolvedValue([coachAction("athlete-1"), coachAction("athlete-2")]);
    mockedGetLatestDailyIqSnapshot.mockResolvedValue({
      dailyIqScore: 82,
      mentalEdgeScore: 76,
      safeLoadScore: 70
    } as Awaited<ReturnType<typeof getLatestDailyIqSnapshot>>);

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(projection.persona).toBe("athlete");
    expect(projection.athleteCount).toBe(1);
    expect(projection.athletes.map((row) => row.id)).toEqual(["athlete-1"]);
    expect(projection.activeQueue.map((row) => row.id)).not.toContain("athlete-2");
  });

  it("exposes both persona views for a dual-role account and honours the requested persona", async () => {
    mockedGetAuthUser.mockResolvedValue(dualRoleUser("dual@example.com", "athlete-1"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue(["athlete-1"]);
    mockedListChildrenWithMetrics.mockResolvedValue([athlete("athlete-1", "Dual Athlete")]);
    mockedListTeams.mockResolvedValue([team("team-1", ["dual@example.com"], ["athlete-1"])]);

    const trainerView = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27", requestedPersona: "trainer" });
    expect(trainerView.persona).toBe("trainer");
    expect(trainerView.availablePersonas).toEqual(["trainer", "athlete"]);

    const athleteView = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27", requestedPersona: "athlete" });
    expect(athleteView.persona).toBe("athlete");
    expect(athleteView.availablePersonas).toEqual(["trainer", "athlete"]);
  });

  it("restricts availablePersonas to a single view for a single-role account", async () => {
    mockedGetAuthUser.mockResolvedValue(trainerUser("coach@example.com"));
    mockedResolveAccessibleAthleteIds.mockResolvedValue([]);

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27", requestedPersona: "athlete" });

    expect(projection.persona).toBe("trainer");
    expect(projection.availablePersonas).toEqual(["trainer"]);
  });

  it("keeps full dashboard visibility for administrator roles", async () => {
    mockedGetAuthUser.mockResolvedValue(adminUser());
    mockedResolveAccessibleAthleteIds.mockResolvedValue(null);
    mockedListChildrenWithMetrics.mockResolvedValue([
      athlete("athlete-1", "First Athlete"),
      athlete("athlete-2", "Second Athlete")
    ]);
    mockedListTeams.mockResolvedValue([team("team-1", ["coach@example.com"], ["athlete-1", "athlete-2"])]);

    const projection = await getAthleteIqProductDashboardProjection({ localDate: "2026-06-27" });

    expect(projection.athleteCount).toBe(2);
    expect(projection.teamCount).toBe(1);
    expect(projection.athletes.map((row) => row.id)).toEqual(["athlete-1", "athlete-2"]);
  });
});

function trainerUser(email: string): AuthUser {
  return {
    email,
    name: "Trainer",
    productEntitlements: {
      habigoal: { enabled: true, reason: "aiq_member" },
      athleteIq: { enabled: true, reason: "trainer_assignment" }
    },
    roles: ["trainer"],
    primaryRole: "trainer",
    teamIds: []
  };
}

function adminUser(): AuthUser {
  return {
    email: "admin@example.com",
    name: "Admin",
    productEntitlements: {
      habigoal: { enabled: true, reason: "admin_grant" },
      athleteIq: { enabled: true, reason: "admin_grant" }
    },
    roles: ["admin"],
    primaryRole: "admin",
    teamIds: []
  };
}

function athleteUser(email: string, athleteId: string): AuthUser {
  return {
    email,
    name: "Athlete",
    athleteId,
    productEntitlements: {
      habigoal: { enabled: true, reason: "aiq_member" },
      athleteIq: { enabled: true, reason: "pro_athlete_membership" }
    },
    roles: ["athlete"],
    primaryRole: "athlete",
    teamIds: []
  };
}

function dualRoleUser(email: string, athleteId: string): AuthUser {
  return {
    email,
    name: "Dual Role",
    athleteId,
    productEntitlements: {
      habigoal: { enabled: true, reason: "aiq_member" },
      athleteIq: { enabled: true, reason: "trainer_assignment" }
    },
    roles: ["trainer", "athlete"],
    primaryRole: "trainer",
    teamIds: []
  };
}

function athlete(id: string, name: string): ChildProfile {
  return {
    _id: id,
    name,
    birthDate: "2008-01-01",
    status: "active",
    latestReadiness: 4,
    latestScores: {
      movement: 4,
      social: 4,
      mental: 4
    },
    createdAt: "2026-06-27T08:00:00.000Z",
    updatedAt: "2026-06-27T08:00:00.000Z"
  };
}

function team(id: string, trainerEmails: string[], athleteIds: string[]): Team {
  return {
    _id: id,
    name: `Team ${id}`,
    trainerEmails,
    athleteIds,
    createdAt: "2026-06-27T08:00:00.000Z",
    updatedAt: "2026-06-27T08:00:00.000Z"
  };
}

function coachAction(athleteKey: string): CoachActionRecord {
  return {
    athleteKey,
    date: "2026-06-27",
    recommendationKey: `action-${athleteKey}`,
    status: "open",
    actorName: "Coach",
    actorEmail: "coach@example.com",
    createdAt: "2026-06-27T08:00:00.000Z",
    updatedAt: "2026-06-27T08:00:00.000Z"
  };
}
