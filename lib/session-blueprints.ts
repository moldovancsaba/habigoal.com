// Reusable session blueprint library (TRN-002, #83).
//
// Weekly plans describe *what* to train; blueprints describe *how* a session
// runs — an ordered set of timed drills a coach/athlete can execute. This is a
// small, deterministic, in-code library (no fabrication, no per-tenant authoring
// yet); the athlete execution record + debrief persistence already exists in the
// session lifecycle, so this fills the missing "what do I actually run" piece.

export type SessionBlueprintVariant = "standard" | "controlled" | "recovery";

export interface SessionDrill {
  /** i18n key under SessionBlueprints.drills.*. */
  titleKey: string;
  /** Planned duration of the drill in seconds. */
  seconds: number;
  /** Optional skill this drill develops (i18n key under SessionBlueprints.skills.*). */
  focusSkillKey?: string;
}

export interface SessionBlueprint {
  key: string;
  /** i18n key under SessionBlueprints.titles.*. */
  titleKey: string;
  variant: SessionBlueprintVariant;
  drills: SessionDrill[];
  active: boolean;
}

export const SESSION_BLUEPRINTS: SessionBlueprint[] = [
  {
    key: "standard-technical",
    titleKey: "standardTechnical",
    variant: "standard",
    active: true,
    drills: [
      { titleKey: "warmup", seconds: 600 },
      { titleKey: "technical", seconds: 900, focusSkillKey: "ballControl" },
      { titleKey: "conditioning", seconds: 600, focusSkillKey: "endurance" },
      { titleKey: "cooldown", seconds: 300 },
    ],
  },
  {
    key: "controlled-skill",
    titleKey: "controlledSkill",
    variant: "controlled",
    active: true,
    drills: [
      { titleKey: "warmup", seconds: 480 },
      { titleKey: "controlledTechnical", seconds: 900, focusSkillKey: "weakFoot" },
      { titleKey: "mobility", seconds: 420, focusSkillKey: "mobility" },
      { titleKey: "cooldown", seconds: 300 },
    ],
  },
  {
    key: "recovery-flow",
    titleKey: "recoveryFlow",
    variant: "recovery",
    active: true,
    drills: [
      { titleKey: "mobility", seconds: 480, focusSkillKey: "mobility" },
      { titleKey: "lightAerobic", seconds: 600, focusSkillKey: "endurance" },
      { titleKey: "stretch", seconds: 420 },
      { titleKey: "breathing", seconds: 300 },
    ],
  },
];

export function getActiveBlueprints(): SessionBlueprint[] {
  return SESSION_BLUEPRINTS.filter((b) => b.active);
}

export function getBlueprintByKey(key: string): SessionBlueprint | null {
  return SESSION_BLUEPRINTS.find((b) => b.key === key) ?? null;
}

/** Total planned duration of a blueprint in seconds. */
export function blueprintDurationSeconds(blueprint: SessionBlueprint): number {
  return blueprint.drills.reduce((sum, drill) => sum + drill.seconds, 0);
}
