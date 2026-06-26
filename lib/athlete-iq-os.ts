import type { ProductFunction, ProductNavigationItem, ProductSurfaceAudience } from "@/lib/product-surfaces";

export type AthleteIqOsStatus = "active" | "lite" | "future";

export type AthleteIqOsModule = {
  anchorId: string;
  code: string;
  group: "Daily OS" | "Stakeholders" | "Development";
  label: string;
  output: string;
  stage: string;
  status: AthleteIqOsStatus;
  summary: string;
  audience: ProductSurfaceAudience[];
};

export type AthleteIqOsGroup = {
  title: AthleteIqOsModule["group"];
  modules: AthleteIqOsModule[];
};

export const ATHLETE_IQ_OS_GROUPS: AthleteIqOsGroup[] = [
  {
    title: "Daily OS",
    modules: [
      {
        anchorId: "home",
        code: "01",
        group: "Daily OS",
        label: "Home",
        output: "Daily IQ, active data, route, checklist, recommendations, and today snapshot.",
        stage: "P0 active",
        status: "active",
        summary: "The operating start screen for the athlete's day and the trainer's live context.",
        audience: ["athlete", "coach", "academy", "operator"]
      },
      {
        anchorId: "profile",
        code: "02",
        group: "Daily OS",
        label: "User Profile",
        output: "Athlete identity, goals, physical context, technical map, mental profile, and history.",
        stage: "P0 active",
        status: "active",
        summary: "Player identity and development context for long-term decisions.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "checkin",
        code: "03",
        group: "Daily OS",
        label: "Check-in",
        output: "Sleep, mood, energy, soreness, stress, pain, motivation, availability, and notes.",
        stage: "P0 active",
        status: "active",
        summary: "Fast daily input that feeds readiness, safety, and plan adaptation.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "session",
        code: "04",
        group: "Daily OS",
        label: "Live Session",
        output: "Recommended drills, session builder, adaptive blocks, timer, and activity log.",
        stage: "P0 active",
        status: "active",
        summary: "Training execution surface for individual plans and trainer adjustments.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "calendar",
        code: "05",
        group: "Daily OS",
        label: "Calendar",
        output: "Daily timeline, sleep, school/life, training, recovery, learning, and week map.",
        stage: "P0 active",
        status: "active",
        summary: "The daily reality map for planning load around the athlete's full schedule.",
        audience: ["athlete", "coach", "academy"]
      }
    ]
  },
  {
    title: "Stakeholders",
    modules: [
      {
        anchorId: "coach",
        code: "06",
        group: "Stakeholders",
        label: "Coach",
        output: "Coach notes, ratings, training plan, session plan, short-term goals, and alerts.",
        stage: "P0 active",
        status: "active",
        summary: "Trainer command view for observations, assignments, risk, and intervention.",
        audience: ["coach", "academy", "operator"]
      },
      {
        anchorId: "parent",
        code: "07",
        group: "Stakeholders",
        label: "Parent",
        output: "Simple development visibility, reassurance, progress, risk, and conversation guide.",
        stage: "P1 lite",
        status: "lite",
        summary: "Stakeholder-safe translation without exposing coach-only or sensitive context.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "team",
        code: "08",
        group: "Stakeholders",
        label: "Team",
        output: "Team readiness, availability, completion, coach alerts, and club-level actions.",
        stage: "P0 active",
        status: "active",
        summary: "Trainer and club management layer for squads, groups, and action queues.",
        audience: ["coach", "academy", "operator"]
      }
    ]
  },
  {
    title: "Development",
    modules: [
      {
        anchorId: "pillars",
        code: "09",
        group: "Development",
        label: "Pillar Status",
        output: "Active, lite/manual, planned, and future states across readiness, mental, physical, technical, tactical, cognitive, video, and lab.",
        stage: "P0 active",
        status: "active",
        summary: "Honest integration layer that shows what is real now and what is staged.",
        audience: ["athlete", "coach", "academy", "operator"]
      },
      {
        anchorId: "recovery",
        code: "10",
        group: "Development",
        label: "Recovery",
        output: "Sleep, soreness, pain, load, stress, HRV, hydration, protocols, and recovery route.",
        stage: "P0 active",
        status: "active",
        summary: "Readiness-protective protocol system for safer training decisions.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "fuel",
        code: "11",
        group: "Development",
        label: "Fuel",
        output: "Hydration, nutrition quality, meal notes, pre-session fuel, post-session fuel, and wind-down advice.",
        stage: "P1 lite",
        status: "lite",
        summary: "Eat-to-perform support that stays clear about data confidence.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "mental",
        code: "12",
        group: "Development",
        label: "Mental",
        output: "Confidence, focus, pressure, motivation, stress, reset routines, and mental edge score.",
        stage: "P0/P1 active",
        status: "active",
        summary: "Psychological performance layer for daily state and pressure routines.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "cognitive",
        code: "13",
        group: "Development",
        label: "Cognitive Lite",
        output: "Football IQ tasks, scanning habits, attention cues, and simple decision logs.",
        stage: "P1 lite",
        status: "lite",
        summary: "A lightweight cognitive layer without claiming full assessment intelligence.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "reflection",
        code: "14",
        group: "Development",
        label: "Reflection",
        output: "Sleep, mental, physical performance, fuel, one win, tomorrow focus, and memory preview.",
        stage: "P0 active",
        status: "active",
        summary: "AI memory input that turns daily notes into tomorrow's context.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "habits",
        code: "15",
        group: "Development",
        label: "Habits",
        output: "Streaks, reminders, completion tracking, accountability, priorities, and habit detail.",
        stage: "P0 active",
        status: "active",
        summary: "Behavior system for consistency across recovery, fuel, physical, and mental pillars.",
        audience: ["athlete", "coach", "academy"]
      },
      {
        anchorId: "roadmap",
        code: "16",
        group: "Development",
        label: "Roadmap",
        output: "Active now, active lite, next build, future, and not-active-yet modules.",
        stage: "P0 active",
        status: "active",
        summary: "Transparent product boundary so the MVP does not overclaim future intelligence.",
        audience: ["coach", "academy", "operator"]
      },
      {
        anchorId: "report",
        code: "17",
        group: "Development",
        label: "Report",
        output: "Daily report, AI recommendations, active module summary, lite scope, and future exclusions.",
        stage: "P0 active",
        status: "active",
        summary: "Professional report surface for trainers, athletes, clubs, and service delivery.",
        audience: ["athlete", "coach", "academy", "operator"]
      }
    ]
  }
];

export const ATHLETE_IQ_OS_MODULES = ATHLETE_IQ_OS_GROUPS.flatMap((group) => group.modules);

export const ATHLETE_IQ_OS_NAVIGATION = ATHLETE_IQ_OS_MODULES.map((module) => ({
  id: module.anchorId,
  label: module.label,
  path: `/athlete-iq#${module.anchorId}`,
  description: module.summary,
  audience: module.audience,
  sharedFunctionId: `aiq-os-${module.anchorId}`
})) satisfies ProductNavigationItem[];

export const ATHLETE_IQ_OS_FUNCTIONS = ATHLETE_IQ_OS_MODULES.map((module) => ({
  id: `aiq-os-${module.anchorId}`,
  name: `AthleteIQ ${module.label}`,
  status: module.status === "active" ? "active" : module.status === "lite" ? "phase-1" : "planned",
  audience: module.audience,
  summary: `${module.summary} Output: ${module.output}`,
  runtimeFlow: [
    `Open ${module.group} / ${module.label}`,
    "Load shared daily status and product-owned professional data",
    "Resolve athlete, trainer, team, and club permissions",
    `Render the ${module.stage} workflow with clear scope`,
    "Record user action, recommendation, report, or acknowledgement"
  ],
  contracts: [
    "Habigoal daily signals remain shared data, not duplicated state",
    "Professional-only context stays inside AthleteIQ role boundaries",
    "Module scope must declare active, lite, or future capability"
  ],
  accessibility: [
    "Every module exposes text status before dense visual summaries",
    "Status cannot rely on color alone",
    "Cards, links, and actions keep keyboard-visible focus states"
  ],
  observability: [
    `Track ${module.anchorId} module view`,
    "Track missing data and degraded module state",
    "Track trainer, athlete, team, and report actions with source confidence"
  ],
  failureMode: `If ${module.label} data is unavailable, preserve the module shell and show a clear ${module.stage} fallback.`
})) satisfies ProductFunction[];
