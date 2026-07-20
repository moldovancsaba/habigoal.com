export type BusinessPersonaContract = {
  id: "habigoal" | "aiq-athlete" | "aiq-trainer";
  label: string;
  publicName: string;
  route: string;
  audience: string;
  purpose: string;
  rights: readonly string[];
  responsibilities: readonly string[];
  dataWrites: readonly string[];
  dataReads: readonly string[];
  uiBoundary: readonly string[];
  outcomes: readonly string[];
};

export type BusinessContractSection = {
  title: string;
  items: readonly string[];
};

export const BUSINESS_LOGIC_CONTRACT_VERSION = "business-logic-contracts-2026-07-20.1";

export const businessContractSourceDocuments = [
  "docs/product-surface-shared-athlete-profile-contract.md",
  "docs/habigoal-production-delivery.md",
  "docs/athleteiq-module-registry.md",
  "docs/athleteiq-daily-iq-contract.md",
  "docs/athleteiq-daily-plan-contract.md",
  "docs/athleteiq-stakeholder-projection-contract.md",
  "docs/athleteiq-daily-report-contract.md",
  "docs/api-access-registry.md",
  "docs/persona-boundary-release-gate.md",
  "lib/product-apps.ts",
  "lib/product-surfaces.ts",
  "lib/api-access-registry.ts",
  "lib/data-sharing-consent.ts"
] as const;

export const businessPersonaContracts = [
  {
    id: "habigoal",
    label: "Habit builder",
    publicName: "Habigoal at habigoal.com",
    route: "/habigoal",
    audience: "Any signed-in person: general users, athletes, trainers, staff, or partners using the white-label habitbuilder.",
    purpose:
      "Habigoal is the independent personal habitbuilder. It helps a person record today's check-in, daily habits, wellbeing signals, and one safe next action without requiring Athlete IQ access.",
    rights: [
      "Use Habigoal without Athlete IQ professional entitlement.",
      "Record and update personal daily check-in and habit information.",
      "See personal daily status only after today's required recording loop is saved.",
      "Keep Habigoal data private unless professional entitlement, assignment, and consent rules allow an Athlete IQ workspace to use it.",
      "Request correction, export, deletion, and privacy review through the governing account and legal process."
    ],
    responsibilities: [
      "Provide accurate personal routine information and update it when the day changes.",
      "Use Habigoal as support guidance, not emergency care, diagnosis, or medical treatment.",
      "Keep account access secure and do not share login credentials.",
      "Respect consent choices when a club, trainer, or partner asks to connect data to Athlete IQ."
    ],
    dataWrites: [
      "User identity and product entitlement record.",
      "Personal routine profile shell in the shared athlete-compatible profile collection.",
      "Canonical check-in records for daily wellbeing signals.",
      "Canonical habit records for daily routine completion.",
      "Redacted operational events with correlation ids for support and audit."
    ],
    dataReads: [
      "Only the signed-in user's personal daily-status projection.",
      "Recent personal history needed to show progress and continuity.",
      "No team, trainer, roster, service, or professional-report data."
    ],
    uiBoundary: [
      "Habigoal renders Habigoal-owned mobile habitbuilder chrome.",
      "Habigoal never renders Athlete IQ command navigation, trainer dashboards, team panels, or professional modules.",
      "Habigoal uses the official GDS Athlete Gold theme through the public/Habigoal product surface contract."
    ],
    outcomes: [
      "Saved daily operation.",
      "Daily status with reason, confidence, and one next action after save.",
      "Personal routine history and habit streak continuity.",
      "Future Athlete IQ compatibility only through shared data contracts, not copied UI."
    ]
  },
  {
    id: "aiq-athlete",
    label: "Athlete workspace",
    publicName: "Athletes at Athlete IQ",
    route: "/athlete-iq?persona=athlete",
    audience: "Athletes with Athlete IQ access through a team, professional membership, club, or administrator grant.",
    purpose:
      "The Athlete IQ athlete workspace lets an athlete see professional performance context about their own account while keeping trainer-only and team-management tools out of the athlete UI.",
    rights: [
      "Access only the signed-in athlete scope authorized by Athlete IQ entitlement.",
      "View own Daily IQ, readiness, habit, plan, session, mental-edge, reflection, progress, and report projections where enabled.",
      "Record shared daily status through the Athlete IQ recorder adapter.",
      "See confidence, missing-data, source-label, and safety-blocker explanations near recommendations.",
      "Keep private/reflection data protected from unauthorized team and parent views."
    ],
    responsibilities: [
      "Submit truthful daily signals, habits, training load, and reflections.",
      "Treat recommendations as support context and follow trainer, medical, and safety escalation rules.",
      "Review blockers and missing-data labels before acting on performance guidance.",
      "Keep credentials private and report data errors through the support or trainer process."
    ],
    dataWrites: [
      "Athlete check-ins and shared daily-status records.",
      "Habit records, reflection records, lite/manual module entries, and task completion state.",
      "Training-load records when the athlete records or confirms a session load.",
      "Read receipts or state changes for athlete-facing tasks where implemented."
    ],
    dataReads: [
      "Own shared daily-status ledger and compatible Habigoal-created history when linked to the same athlete identity.",
      "Own Daily IQ snapshots, daily plans, reports, session context, and permitted module outputs.",
      "Team or trainer context only when it is projected as athlete-safe information."
    ],
    uiBoundary: [
      "Athlete IQ athlete mode renders Athlete IQ athlete chrome, not Habigoal UI.",
      "Athlete mode hides trainer roster management, team operations, coach action queues, service administration, and club controls.",
      "Athlete mode uses GDS Athlete Gold with athlete-safe labels, non-color-only states, and keyboard-reachable controls."
    ],
    outcomes: [
      "Daily IQ with explanation and confidence.",
      "Daily plan, session recommendation, and safety blockers.",
      "Athlete progress view and source-labeled reports.",
      "Shared status updates available to authorized trainer workflows."
    ]
  },
  {
    id: "aiq-trainer",
    label: "Trainer workspace",
    publicName: "Trainers at Athlete IQ",
    route: "/athlete-iq?persona=trainer",
    audience: "Trainers, coaches, performance staff, physios, analysts, club management, and admins with professional Athlete IQ entitlement.",
    purpose:
      "The Athlete IQ trainer workspace is the professional operating surface for managing assigned athletes, reviewing daily signals, taking coach actions, planning sessions, and producing reports.",
    rights: [
      "View assigned athletes, team summaries, and allowed professional modules.",
      "Read Habigoal-created daily-status history only through entitlement, assignment, and consent checks.",
      "Create and update coach actions, session plans, thresholds, reports, messages, and support workflows where authorized.",
      "Use aggregate team insights only where privacy thresholds and role permissions allow.",
      "Receive operational errors with correlation ids for support and retry decisions."
    ],
    responsibilities: [
      "Act only within assigned team, club, athlete, consent, and role boundaries.",
      "Use data for support, planning, and performance operations, not unauthorized surveillance or diagnosis.",
      "Document coach actions and intervention decisions through auditable workflows.",
      "Respect missing-data, confidence, safety, and redaction labels before making recommendations.",
      "Keep athlete data confidential and follow partner, club, legal, and data-protection obligations."
    ],
    dataWrites: [
      "Coach action records and acknowledgement state.",
      "Team, roster, invitation, assignment, and service-operation state where permitted.",
      "Training plans, training-load entries, thresholds, reports, and professional notes.",
      "Privacy-safe operational events for dashboard views, action writes, report generation, and failures."
    ],
    dataReads: [
      "Assigned athlete shared daily-status records, including linked Habigoal history when authorized.",
      "Daily IQ, Daily Plan, pain safety, mental edge, reports, stakeholder projections, team trends, and module registry outputs.",
      "Team aggregates only when minimum privacy thresholds are met."
    ],
    uiBoundary: [
      "Trainer mode renders Athlete IQ trainer command chrome only.",
      "Trainer mode never embeds Habigoal habitbuilder cards or publishes Habigoal functions as trainer modules.",
      "Professional states degrade per module so one failed service does not break the trainer shell."
    ],
    outcomes: [
      "Team and athlete priority queue.",
      "Coach action workflow with audit trail.",
      "Session and support planning decisions.",
      "Source-labeled reports and exportable professional snapshots.",
      "Operational visibility into incomplete data, safety blockers, and retryable failures."
    ]
  }
] as const satisfies readonly BusinessPersonaContract[];

export const trainerSupportFlow = [
  "Resolve professional entitlement, role, team membership, athlete assignment, and consent before loading athlete data.",
  "Load assigned athlete signals from shared daily status, Daily IQ, Daily Plan, pain safety, mental edge, training load, reports, and stakeholder projections.",
  "Separate athletes into ready, watch, risk, incomplete, and unavailable states with text labels and not color alone.",
  "Prioritize safety blockers, missing check-ins, falling trends, habit gaps, and coach action follow-up.",
  "Create or update coach actions, session plans, messages, reports, or support tasks through auditable Athlete IQ APIs.",
  "Record the professional action with actor, athlete scope, correlation id, timestamp, and source context.",
  "Recompute or refresh projections after meaningful data changes while preserving immutable historical snapshots."
] as const;

export const dataSharingContract: readonly BusinessContractSection[] = [
  {
    title: "Source of truth",
    items: [
      "MongoDB Atlas is the canonical operational store for users, profiles, check-ins, habits, teams, coach actions, training load, plans, reports, and projection snapshots.",
      "Products do not own separate duplicate truth stores. They read and write through shared contracts and product-specific projections."
    ]
  },
  {
    title: "Shared daily-status ledger",
    items: [
      "Source contract id: shared-daily-status-ledger.",
      "Habigoal writes personal daily routine records.",
      "Athlete IQ athletes can read and write their own athlete daily-status records.",
      "Athlete IQ trainers can read team or assigned-athlete daily-status records only through professional entitlement, assignment, and consent boundaries."
    ]
  },
  {
    title: "Distribution rules",
    items: [
      "Habigoal never receives trainer/team views.",
      "Athlete IQ never imports Habigoal UI or Habigoal function cards.",
      "Professional projections may use Habigoal-created history as data after access checks pass.",
      "Parent, team, and aggregate views redact or suppress sensitive details based on privacy rules and minimum group thresholds."
    ]
  }
];

export const storageContract: readonly BusinessContractSection[] = [
  {
    title: "Identity and access",
    items: ["users", "teams", "invitations", "product entitlements", "role and assignment state"]
  },
  {
    title: "Daily status and routines",
    items: ["children / shared athlete-compatible personal routine profiles", "assessments / check-in records", "habit_records", "training_load_records"]
  },
  {
    title: "Athlete IQ professional records",
    items: ["coach_actions", "athleteiq_daily_iq_snapshots", "athleteiq_daily_plans", "athleteiq_daily_reports", "module registry outputs and stakeholder projections"]
  }
];

export const interfaceSeparationRules = [
  "Habigoal route: /habigoal. Habitbuilder UI only. No Athlete IQ route chrome, trainer dashboard, team panel, or professional function registry.",
  "Athlete IQ athlete route: /athlete-iq?persona=athlete. Athlete-safe AIQ workspace only. No Habigoal cards and no trainer-only controls.",
  "Athlete IQ trainer route: /athlete-iq?persona=trainer. Professional command workspace only. No Habigoal interface and no unauthorized athlete scope.",
  "All three personas use the official GDS Athlete Gold theme and product-surface color contracts.",
  "Route/API authorization enforces boundaries server-side; hidden navigation is never treated as security."
] as const;

export const apiContract = [
  "POST /api/auth/login validates requested product access before redirecting.",
  "GET /api/auth/me exposes current identity, persona, and product entitlements without leaking unavailable product data.",
  "POST /api/habigoal/daily-operation writes Habigoal personal check-in and habit records with idempotency.",
  "The API access registry classifies every route by access class, product surface, persona scope, method, denial code, observability, timeout, and rollback behavior.",
  "Athlete IQ Daily IQ, Daily Plan, stakeholder, module, report, session, team, and coach-action APIs require Athlete IQ entitlement and scoped athlete/team access.",
  "Trainer reads of shared daily-state categories pass through consent decisions before personal check-in or habit details are projected.",
  "All operational errors return structured codes, retryable flags, and correlation ids where the API contract supports them."
] as const;

export const outcomeContract = [
  "Habigoal outcome: a saved personal daily operation, daily status after recording, reason, confidence, next action, and habit continuity.",
  "AIQ athlete outcome: own performance context, Daily IQ, daily plan, session recommendation, progress history, and source-labeled reports.",
  "AIQ trainer outcome: assigned-athlete oversight, team trends, priority queue, coach actions, planning decisions, and auditable professional reports.",
  "System outcome: one compatible data foundation with separated product UI, separated function registries, role-safe projections, and auditable operations."
] as const;

export const operationalContract = [
  "Accessibility is mandatory: keyboard-reachable controls, semantic headings, text labels for status, visible focus states, and no color-only meaning.",
  "Observability is privacy-safe: logs use correlation ids and hashed identifiers, not raw emails, tokens, cookies, notes, or sensitive health details.",
  "Retries must preserve user-entered values and only retry operations marked retryable by the API.",
  "Timeouts and partial failures degrade individual modules rather than crossing product boundaries or replacing data with fake values.",
  "Rollback is additive where possible: keep existing records readable, remove consumers or disable modules, and never restore demo scores or copied UI."
] as const;
