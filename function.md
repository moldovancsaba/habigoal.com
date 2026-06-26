# AthleteIQ Function Architecture

Date: 2026-06-26

This document consolidates the ten supplied source files into one functional architecture. It is written as a product-function map, not as a marketing summary. The goal is to preserve everything useful from the sources, remove duplication, and make the operating model executable inside Habigoal/AthleteIQ.

## 1. Source Inventory

| # | File | Type | Core contribution | Confidence |
| --- | --- | --- | --- | --- |
| 1 | `PHOTO-2026-06-08-14-01-21.jpg` | Image mockup | Cognitive trait result journey with trait navigation, score gauge, cognitive signature, improvement tip, and next-step navigation. | High, visual only |
| 2 | `cogLeauge Pitch deck, athletence V1.2.pdf` | 14-page PDF deck | CogMap/cogLeague cognitive performance partnership, quarterly tournament model, six cognitive traits, player/coach/partner value, rollout, and revenue share. | High, text and visual extraction |
| 3 | `text.txt` | Hungarian note | Client feedback synthesis: first focus should be psychology/mental and readiness, with smaller learning layer and lifestyle/performance modes. | High |
| 4 | `text 2.txt` | Hungarian note | CogMap opportunity context: cognitive assessment with four yearly checkpoints, strong product/research team, weak sales focus, partnership potential. | High |
| 5 | `athleteiq_daily_development_os_v4.html` | HTML prototype | Full daily OS prototype: home, check-in, live session, to-do, learning, recovery, fuel, mental, reflection, habits, calendar, wearables, report. | High, readable source |
| 6 | `PHOTO-2026-06-21-20-06-45.jpg` | Image concept | GameFlow AI match-quality measurement architecture: active football, preparation, dead time, match friction, delay attribution, broadcaster/referee/league/team use cases. | High, visual only |
| 7 | `AIQ.pdf` | 2-page image PDF | AthleteIQ pitch architecture and commercial model: fragmented football development problem, six-pillar platform, product layers, entry strategy, SaaS pricing, ROI, risk, use of funds. | High, rendered visual extraction |
| 8 | `PHOTO-2026-06-08-11-13-13.jpg` | Image ecosystem map | AthleteIQ ecosystem and operating departments: development team, sports lab, methodology/IP, operations, business development, external partners, hardware, users. | High, visual only |
| 9 | `PHOTO-2026-06-23-09-05-05.jpg` | Image UI mockup | Daily wellness scale: sleep quality, fatigue, pain, stress, mood, 1-10 row inputs, submit flow. | High, visual only |
| 10 | `athleteiq_daily_development_os_v7.html` | HTML prototype | Layered MVP v7: explicit active/lite/future feature truth, profile, check-in, session builder, calendar, coach, parent, team, pillar status, recovery, fuel, mental, cognitive lite, reflection, habits, roadmap, report. | High, readable source |

## 2. Executive Synthesis

The ten sources describe one product, but at three maturity levels:

1. **Immediate MVP**: daily readiness, mental state, pain, habits, training logs, calendar, athlete profile, coach notes, parent/team views, and daily reports.
2. **Layered expansion**: recovery protocols, fuel guidance, cognitive-lite tasks, learning modules, reflection memory, wearables, and session planning.
3. **Strategic platform**: six-pillar AthleteIQ operating system, sports lab assessments, cognitive tournaments through CogMap/cogLeague, match-flow intelligence through GameFlow AI, commercial SaaS/pricing, and partner/ecosystem operations.

The repeated signal across the sources is clear: do not start with a broad, overclaimed six-pillar platform. Start with a trustworthy daily loop around **readiness + mental/psychology + pain + habits + simple learning**, then expose which modules are active, lite/manual, planned, or future.

## 3. Canonical Product Thesis

AthleteIQ should be the daily development operating system for football players. It should help athletes, coaches, parents, teams, academies, and partners answer:

- What is the athlete's state today?
- What should the athlete do next?
- What should the coach adjust?
- What is improving over time?
- Which claims are backed by real data, and which are future/lite/manual?

The system should not present every long-term ambition as already active. The v7 prototype gives the correct trust model: active now, lite/manual now, future later.

## 4. Source-by-Source Functional Understanding

### 4.1 Cognitive Trait Journey Image

The cognitive UI shows a trait-by-trait journey with:

- Left vertical navigation for cognitive dimensions:
  - Alertness
  - Impulse Control
  - Attention
  - Memory - Part 1
  - Risk
  - Memory - Part 2
  - Reasoning
- Trait detail page with:
  - Icon and trait title
  - Gauge score, for example 90/100
  - Low-to-high readiness scale
  - Plain-language explanation
  - Cognitive signature summary
  - Improvement tip
  - Back to journey and next trait actions

Functional takeaway:

- Cognitive assessment should be a guided journey, not a raw result table.
- Each trait needs a score, explanation, strength narrative, actionable improvement tip, and progression navigation.
- This should become either a future CogMap integration surface or a local Cognitive Lite result renderer.

### 4.2 CogLeague x Athletence Pitch Deck

The deck defines cogLeague as a recurring cognitive performance tournament layered onto an existing sports/assessment distribution network.

Core concepts:

- Cognitive performance is positioned as the "game behind the game".
- Lab/remote assessments are one-off snapshots unless turned into a recurring engagement loop.
- cogLeague solves the gap by combining measurement, benchmarking, and development through competition.
- Annual structure:
  - Q1 qualification tournament
  - Q2 qualification tournament
  - Q3 qualification tournament
  - Q4 final
  - 4 tournaments per year
  - Up to 3 attempts per tournament
  - Cohorts from U9 to U23, all ages included
- Six cognitive traits:
  - Alertness
  - Impulse Control
  - Attention
  - Risk
  - Reasoning
  - Memory and Retention
- Player value:
  - Individual cognitive fitness profile
  - Scores across six dimensions
  - Progress tracking across four tournaments
  - Competition-based progression
  - Rewards and scholarships as engagement hooks
  - Strength and development-gap breakdowns
- Coach value:
  - Team-level cognitive comparisons
  - Dashboard visibility across squads
  - Selection and development support
  - Academy-level gap identification
- Partner/Athletence value:
  - Partner dashboard across all participants
  - Cohort comparisons
  - Age-group benchmarks
  - Development gap identification
  - Year-on-year tracking
- Rollout:
  - Select 2-3 pilot cohorts
  - Run tournament 1
  - Review individual/team reports
  - Scale across network
- Commercial model:
  - End-user price: 100 USD per participant per year
  - 30 percent revenue share baseline
  - 35 percent at 1,000+ active participants
  - 40 percent at 5,000+ active participants
  - 10,000 participants implies 400,000 USD annual revenue to Athletence under the deck model

Functional takeaway:

- CogLeague should not be built as a normal daily check-in feature.
- It is a quarterly/seasonal competitive assessment module with cohort rules, attempt windows, rankings, rewards, and partner dashboards.
- It can share the same athlete profile and reporting model, but it needs separate assessment cadence, scoring, and commercialization concepts.

### 4.3 Hungarian Note: Product Focus

The note says recent feedback from clubs and coaches indicates the first product focus should be:

- Psychology/mental pillar
- Readiness pillar
- Smaller learning component
- Simple initial integrations such as Oura or similar devices
- Two selectable experience depths:
  - Lifestyle: simpler, lower data burden
  - Performance: more complex, richer data, roughly 30-40 percent more detailed than lifestyle

Functional takeaway:

- Lifestyle/performance mode is not decoration. It changes required inputs, feedback depth, score confidence, and amount of data requested.
- The MVP should avoid demanding full performance data from every user.

### 4.4 Hungarian Note: CogMap Partnership Context

The note introduces CogMap as a London-based contact's company with a unique cognitive assessment and four checkpoints per year. It measures cognitive maturity, patterns, profiles, and related traits. The product/research references appear strong, but sales has not been emphasized.

Functional takeaway:

- AthleteIQ can be a distribution and productization partner for cognitive assessment.
- The integration should be framed as partner module / assessment marketplace / seasonal cognitive checkpoint, not as a core daily OS dependency.

### 4.5 AthleteIQ Daily Development OS v4

The v4 prototype is the richest daily-loop mockup. It includes:

- Sidebar navigation:
  - Home
  - Check-in
  - Live Session
  - Daily To-Do
  - Learning Hub
  - Recovery
  - Fuel
  - Mental
  - Reflection
  - Habits
  - Calendar
  - Wearables
  - Daily Report
- Home dashboard:
  - Daily IQ
  - Readiness
  - Recovery
  - Sleep
  - Stress
  - Focus
  - Load
  - Mood
  - Body/lifestyle data used
  - Daily plan
  - Skill sessions
  - Wearables summary
  - Habit streaks
  - Pillar balance spider chart
  - Pain/injury alert
- Daily check-in:
  - Lifestyle vs performance detail level
  - Core morning readiness
  - Performance detail
  - Youth/school context
  - Lifestyle context
  - Pain and injury inputs
  - Quick state note
  - Data confidence
  - Live preview of today's plan
- Live session:
  - Adaptive session length
  - Blueprint blocks
  - Timer
  - Quick skill sessions
  - Training log
- Learning hub:
  - Short lessons
  - Recommended lessons based on stress/sleep/state
  - Action plans
- Recovery:
  - Sleep, HRV, resting heart rate, soreness, hydration, naps
  - Protocol selection from readiness inputs
- Fuel:
  - Protein, carbs, fat, water
  - Meal toggles
  - AI fuel tip
  - Wind-down recommendation
- Mental:
  - Confidence
  - Focus
  - Resilience
  - Discipline
  - Reset quality
  - Mental routine
- Reflection:
  - One win
  - One lesson
  - Tomorrow focus
  - AI memory preview
- Habits:
  - Streaks
  - Weekly completion dots
  - Next-week priorities
- Calendar:
  - Weekly plan
  - Readiness-driven regeneration
- Wearables:
  - Manual sync for resting heart rate, HRV, steps, active minutes, sleep minutes, device sleep score
- Daily report:
  - Report generation
  - JSON export
  - Coach recommendation
  - Missing-data handling

Functional takeaway:

- v4 is a functional library of modules and detailed micro-interactions.
- It is too broad for a disciplined MVP if taken literally.
- Keep the modules, but classify them into active, lite/manual, and future.

### 4.6 GameFlow AI Image

GameFlow AI is a separate but adjacent sports-intelligence concept:

- Problem:
  - A match is 90 minutes on the clock, but actual football activity is lower due to interruptions.
  - Delays include injuries, throw-ins, VAR reviews, goal kicks, substitutions, free kicks, celebrations, hydration breaks, time wasting, and referee delays.
- Solution:
  - AI-powered methodology that classifies every second of a match.
  - Inputs include broadcast feeds, stadium cameras, tracking systems, event data feeds, and historical footage.
  - AI engine performs computer vision, event detection, context understanding, and delay classification.
- Match state model:
  - Active football, weight 100 percent
  - Football preparation, weight 50 percent
  - Dead time, weight 0 percent
- Core metrics:
  - Football Value percentage
  - GameFlow Rating, 0-100
  - Match Friction Index
  - Delay Attribution Analysis
- Analytics audiences:
  - Team flow analytics
  - Referee flow analytics
  - League flow analytics
  - Broadcaster overlays
- Business model:
  - Licensing to federations/leagues/clubs
  - Media licensing
  - Data/API access
  - Consumer app
- Long-term vision:
  - Universal standard for measuring how sports are actually played.
  - Adaptable beyond football.

Functional takeaway:

- GameFlow should not be mixed into the daily readiness MVP.
- It belongs in the future technical/tactical/match-intelligence layer.
- It could later feed athlete/team context, match load, tactical learning, broadcaster product, and league benchmarking.

### 4.7 AIQ PDF

The AIQ PDF contains two strategic pages.

Page 1: Platform architecture

- AthleteIQ is an intelligence layer for football player development.
- It connects:
  - Player data
  - Coach input
  - Daily habits
  - Readiness
  - Video
  - AI
- Problem:
  - Football development is fragmented.
  - Players, parents, coaches, academies use separate tools.
  - Existing systems collect information but do not convert it into clear development actions.
- Solution:
  - Digital Athlete Twin
  - Six-pillar development model
  - Player profile across six core pillars:
    - Technical
    - Tactical
    - Cognitive
    - Physical
    - Mental
    - Readiness
- Core product layers:
  1. Digital Athlete Twin
  2. Six-Pillar Framework
  3. Training and Learning Engine
  4. Data and Measurement Layer
  5. AI Intelligence Layer
  6. Coach / Academy OS
  7. Physical Tech Layer
- Commercial entry strategy:
  - Player assessments
  - Academy pilots
  - Coach-reviewed development reports
  - Performance testing
  - Training packages
  - Early academy dashboards
  - Player development plans
  - Methodology-based consulting
- Timing thesis:
  - Football is global, competitive, and increasingly data-driven.
  - Parents and clubs want better visibility.
  - The market lacks one connected development path.

Page 2: Commercial model

- Diversified business model:
  - SaaS licensing to academies/clubs/teams
  - Individual player subscriptions
  - Performance testing and sports labs
  - Equipment and smart stations
  - Coach education and certification
  - Methodology licensing
  - Strategic partnerships
- Example SaaS pricing:
  - Starter: up to 50 athletes, 999 EUR/month, 11,988 EUR/year
  - Academy: up to 250 athletes, 1,999 EUR/month, 23,988 EUR/year
  - Professional: up to 1,000 athletes, 3,999 EUR/month, 47,988 EUR/year
  - Enterprise: custom
- Revenue scenarios:
  - Conservative: 103,164 EUR total annual revenue
  - Base: 390,166 EUR total annual revenue
  - Expansion: 865,720 EUR total annual revenue
- Investment ask:
  - 100,000-250,000 EUR
  - Seed round, phased investment against milestones
- Use of funds:
  - Software platform and AI
  - Hardware and testing
  - Validation and pilots
  - Business development
  - Legal/IP/operations
  - Working capital
- Risk index:
  - Product complexity, AI accuracy/trust, hardware dependency, sales cycle, market adoption, data privacy, capital sufficiency.

Functional takeaway:

- The full product architecture is broader than the MVP.
- SaaS and lab/testing models require operational readiness, governance, privacy, and reporting.
- `function.md` should distinguish software functions from business model functions and sports-lab functions.

### 4.8 AthleteIQ Ecosystem Image

The ecosystem map defines what must exist around the software:

- Central platform software:
  - Athlete profiles
  - Daily check-ins
  - Player index across six domains
  - Training plans
  - AI recommendations
  - Coach dashboard
  - Progress tracking
  - Reports and insights
- Development team:
  - Software developers
  - UI/UX designer
  - AI/data specialist
  - Product manager
  - QA/testing
  - Technical advisors
- Internal sports lab:
  - Performance testing
  - Physical assessments
  - Cognitive and reaction testing
  - Video analysis
  - Wearable data collection
  - Case studies and validation
  - Athlete reports
- Methodology/IP:
  - Athlete development framework
  - Six pillars: technical, physical, cognitive, tactical, mental, recovery
  - Micro-skill structure
  - Testing/scoring logic
  - AI recommendation engine
  - Coach workflow
- Operations:
  - Legal and compliance
  - Finance and budgeting
  - Administration
  - Policies and governance
  - Internal processes
  - Reporting and support
- Business development:
  - Go-to-market
  - Sales and partnerships
  - Pricing and packaging
  - Marketing and brand growth
  - Investor relations
  - Customer success
- Partners:
  - Clubs and teams
  - Academies
  - Coaches and trainers
  - Universities and research
  - Performance centers
  - Medical/physio partners
  - Technology providers
- Hardware:
  - Wearables
  - Cameras/video systems
  - Tablets/mobile
  - Reaction lights
  - GPS/speed tools
  - Force plates/jump mats
  - Heart-rate monitors
  - Cloud/data infrastructure
- Users:
  - Individual athletes
  - Youth players
  - Teams/squads
  - Coaches
  - Parents
  - Clubs/organizations

Functional takeaway:

- The product is not only code. It requires methods, validation, operations, partners, and service packaging.
- Software should expose these operational concepts instead of burying them.

### 4.9 Daily Wellness Scale Image

The wellness UI shows a fast five-row wellness check:

- Sleep quality, 1-10
- Fatigue, 1-10
- Pain, 1-10, with edit action
- Stress, 1-10
- Mood, 1-10

Each row has left and right anchors, selected value states, and a submit button.

Functional takeaway:

- This is the simplest viable daily check-in.
- It maps directly to the user note asking for a lifestyle/simpler mode.
- Performance mode can add HRV, resting heart rate, training load, soreness detail, motivation, confidence, focus, notes, and availability.

### 4.10 AthleteIQ Daily Development OS v7

The v7 prototype is the strongest MVP governance model. It contains:

- Daily OS navigation:
  - Home
  - User Profile
  - Check-in
  - Live Session
  - Calendar
- Stakeholders:
  - Coach
  - Parent
  - Team
- Development:
  - Pillar Status
  - Recovery
  - Fuel
  - Mental
  - Cognitive Lite
  - Reflection
  - Habits
  - Roadmap
  - Report
- Lifestyle/performance mode switch.
- Product truth banner:
  - This is the Daily Development OS, not yet the full six-pillar platform.
  - Show which pillars are active, lite, and future.
- Athlete profile:
  - Identity
  - Age, position, foot, level
  - Development anchors
  - Active profile
  - Lite/manual profile
  - Future profile
- Check-in:
  - Sleep, mood, energy, soreness, stress, pain, motivation, availability, notes
  - Performance detail if selected
  - Multiple pain alerts
  - Daily goal and availability
  - Data confidence
  - Rules used today
  - AI plan preview
- Live session:
  - Recommended drills
  - Individual plan
  - Recovery plan
  - Completion tracking
  - Custom session builder
  - Activity log
- Calendar:
  - Sleep
  - School/life
  - Training
  - Recovery
  - Learning
  - Alerts
  - Readiness curve
- Coach OS:
  - Coach notes
  - Ratings
  - Training plan
  - Session plan
  - Short-term goals
  - Player status
- Parent view:
  - Reassurance
  - Progress
  - Risk
  - Next focus
  - Conversation guide
- Team dashboard:
  - Readiness
  - Availability
  - Completion
  - Coach alerts
  - Team intelligence
- Pillar status:
  - Active now
  - Lite/manual
  - Planned
  - Future
  - Input -> rule -> output explainability
- Recovery:
  - Sleep
  - Soreness
  - Pain
  - Load
  - Stress
  - HRV
  - Hydration
- Fuel:
  - Hydration
  - Nutrition quality
  - Pre-session meal
  - Post-session fuel
- Mental:
  - Confidence
  - Focus
  - Pressure
  - Motivation
  - Stress
  - Reset routines
- Cognitive Lite:
  - Learning tasks
  - Attention cues
  - Scanning habits
  - Simple reaction/decision logs
- Reflection:
  - Sleep reflection
  - Mental reflection
  - Physical performance reflection
  - Eat-to-perform reflection
  - One win
  - Tomorrow focus
  - AI memory preview
- Habits:
  - Check-ins
  - Streaks
  - Reminders
  - Completion tracking
  - Accountability
- Reports:
  - Active-module report only
  - Future/lite claims excluded or labeled

Functional takeaway:

- v7 is the canonical structure for MVP delivery.
- v4 is the detailed interaction library.
- AIQ PDF is the strategic platform map.
- CogLeague and GameFlow are partner/future modules.

## 5. Unified Function Taxonomy

### 5.1 Core Daily Loop

Purpose: turn daily self-report and available device/session data into readiness, recommendations, and actions.

Functions:

1. Athlete opens daily home.
2. System shows last known Daily IQ/readiness state.
3. Athlete completes check-in.
4. System computes scores, confidence, and route.
5. System generates daily checklist.
6. Athlete executes tasks/session/habits.
7. Athlete logs session and reflection.
8. Coach/parent/team views update from the same source.
9. Daily report explains what data was used and what is missing.

### 5.2 Athlete Profile and Digital Twin

Profile must store:

- Identity:
  - Name
  - Age/date of birth
  - Position
  - Preferred foot
  - Level
  - Team/club
- Development anchors:
  - Current goals
  - Focus areas
  - Short-term targets
  - Coach notes
- Active profile:
  - Daily readiness history
  - Recovery profile
  - Psychological daily profile
  - Development history from logs
- Lite/manual profile:
  - Technical profile
  - Physical profile
  - Cognitive profile
  - Internal benchmark comparisons
- Future profile:
  - Tactical profile
  - Video-derived technique score
  - Lab testing battery
  - Predictive development forecast

### 5.3 Readiness Engine

Inputs:

- Sleep quality
- Sleep duration
- Fatigue
- Pain level and body area
- Stress
- Mood
- Energy
- Soreness
- Motivation
- Availability
- HRV, optional
- Resting heart rate, optional
- Training load/session log
- Hydration/fuel

Outputs:

- Daily readiness score, 0-100
- Route:
  - Green route: normal training
  - Amber route: modified/intensity-managed
  - Red route: recovery/coach check
- Score confidence percentage
- Missing data list
- Reasoning/rules used
- Daily plan preview

Rules:

- Pain acts as a safety cap.
- Low sleep and high soreness reduce physical intensity.
- Low mental state simplifies pressure tasks.
- Device data increases confidence but should not be required for lifestyle mode.
- Unknown data must be excluded or marked missing, not fabricated.

### 5.4 Mental and Psychology Pillar

This is a priority MVP pillar.

Inputs:

- Confidence
- Focus
- Pressure
- Motivation
- Stress
- Mood
- Reset quality
- Notes

Outputs:

- Mental Edge score
- Recommended mental routine
- Reflection prompt
- Coach alert if mental state is low
- Parent-safe summary

Suggested routines:

- Breathing reset
- One process goal
- Visualization
- Mistake reset
- One win / one lesson / tomorrow focus

### 5.5 Lifestyle vs Performance Modes

Lifestyle mode:

- Fast daily wellness scale
- Sleep, fatigue, pain, stress, mood
- Optional notes
- Simple plan
- Lower data burden
- Suitable for youth players and broad adoption

Performance mode:

- All lifestyle inputs
- HRV, resting HR, sleep duration, soreness, hydration
- Training log/RPE
- Motivation, confidence, focus
- Availability
- Pain/injury details
- More detailed recommendations
- Higher score confidence

Mode should affect:

- Required fields
- Number of questions
- Report depth
- Data-confidence explanation
- Recommendation specificity

### 5.6 Pain and Injury Safety Layer

Functions:

- Record one or multiple pain alerts.
- Capture body area, pain type, and level.
- Allow edit/remove.
- Cap readiness and session intensity when pain is high.
- Surface coach alert.
- Show parent-safe reassurance/risk summary.
- Avoid medical overclaiming.

### 5.7 Live Session and Training Builder

Functions:

- Recommend sessions from current readiness/mental/pain route.
- Split session into timed blocks.
- Start/pause/next block timer.
- Create custom session with title, start, duration, and blocks.
- Log session type, minutes, RPE, completion, skill focus, coach rating, and notes.
- Convert completed logs into development history.

Session types:

- Recovery
- Mobility
- Mental skill
- Technical
- Tactical
- Physical
- Cognitive lite
- Match/team practice

### 5.8 Calendar and Daily Reality Map

Functions:

- Show 24-hour daily timeline.
- Include sleep, school/life, training, recovery, learning, habits, and alerts.
- Add plan items.
- Mark tasks done.
- Show readiness curve.
- Regenerate week based on readiness, recovery, load, lifestyle, and mental state.

### 5.9 Habits and To-Do System

Functions:

- Daily checklist
- Habit streaks
- Weekly dots
- Done-today action
- Missed-day visibility
- Habit score
- Next-week priorities

Habits should connect to pillars:

- Recovery
- Mental
- Fuel
- Learning
- Training consistency

### 5.10 Learning Hub

Functions:

- 5-10 minute lessons
- Recommended lessons based on state
- Action plans
- Lesson completion
- AI memory update

Lesson themes:

- Box breathing
- Stress reset
- Visualization
- Journaling
- Sleep wind-down
- Mindfulness
- Mistake reframing
- Fuel/hydration basics

### 5.11 Recovery System

Inputs:

- Sleep
- Soreness
- Pain
- Stress
- HRV
- Resting heart rate
- Load
- Hydration
- Naps

Outputs:

- Recovery score
- Recommended protocol
- Protocol logic
- Wind-down plan
- Load adjustment

### 5.12 Fuel System

Inputs:

- Protein
- Carbs
- Fat
- Water
- Meal rhythm
- Pre-session fuel
- Post-session fuel

Outputs:

- Fuel score
- Nutrition tip
- Hydration action
- Wind-down connection
- Meal plan suggestion

MVP status: useful but should be P1/lite unless nutrition support is validated.

### 5.13 Reflection and AI Memory

Inputs:

- Sleep/recovery note
- Mental note
- Physical performance note
- Fuel note
- One win
- One lesson
- Tomorrow focus

Outputs:

- Reflection score/completeness
- AI memory preview
- Tomorrow recommendation context
- Coach/parent narrative support

### 5.14 Coach OS

Functions:

- Coach notes
- Effort/execution/status ratings
- Assigned plan
- Coach alerts
- Player status
- Short-term goals
- Session plan
- Comparison across team

Coach should see:

- Who is ready
- Who is limited
- Who missed check-in
- What pain/mental/recovery alerts exist
- What action is recommended

### 5.15 Parent View

Purpose: translate data into simple support, not technical analysis.

Functions:

- Is everything okay?
- Progress this week
- Conversation guide
- Risk/reassurance
- Next focus

Tone:

- Reassuring
- Concrete
- No medical diagnosis
- Avoid blame

### 5.16 Team Dashboard

Functions:

- Team readiness average
- Ready/amber/red groups
- Completion status
- Coach alerts
- Athlete cards
- Team intelligence

### 5.17 Pillar Status and Product Truth

This is mandatory because the sources repeatedly mix MVP and long-term vision.

Every module should have one of:

- Active Now
- Lite / Manual
- Planned
- Future

Every report should state:

- What data was used
- What data was missing
- What module maturity applies
- What claims are not active yet

### 5.18 Cognitive Lite and CogLeague

Cognitive Lite MVP:

- Scanning cue
- Attention task
- Decision log
- Simple reaction/decision self-score
- Learning task

CogLeague future/partner module:

- Six cognitive traits
- Quarterly tournaments
- Cohorts and age groups
- Attempts and leaderboards
- Player profile and coach/team dashboard
- Partner dashboard
- Revenue share model

The two should not be duplicated. Cognitive Lite is the placeholder and preparation layer. CogLeague is the assessment/competition layer.

### 5.19 GameFlow / Match Intelligence

Future module:

- Match flow value
- Active football vs preparation vs dead time
- Delay attribution
- Team/referee/league/broadcaster analytics
- Video/data ingestion

Relationship to AthleteIQ:

- Can feed tactical/technical/match-load context later.
- Should not be an MVP dependency.

### 5.20 Reports and Export

Functions:

- Daily report
- Coach recommendation
- Parent-safe summary
- Export JSON
- Missing data handling
- Active/lite/future claim separation

Report sections:

- Daily IQ
- Readiness
- Mental Edge
- Physical readiness
- Fuel/hydration
- Route
- Active modules
- Lite modules
- Future modules
- Coach summary

## 6. Data Model Implications

### 6.1 Core Entities

```text
Athlete
  identity
  developmentAnchors
  baselineProfile
  activeProfile
  liteProfile
  futureProfile

DailyCheckIn
  athleteId
  date
  mode
  wellnessInputs
  mentalInputs
  painAlerts
  availability
  notes
  deviceSnapshot
  scoreConfidence
  computedScores

DailyPlan
  athleteId
  date
  route
  checklist
  recommendedSessions
  recoveryProtocol
  mentalRoutine
  fuelTip
  rulesUsed

TrainingLog
  athleteId
  date
  type
  minutes
  rpe
  completion
  skillFocus
  coachRating
  pain
  notes

HabitRecord
  athleteId
  date
  statuses
  streaks
  pillarBreakdown

Reflection
  athleteId
  date
  sleepRecovery
  mental
  physical
  fuel
  win
  lesson
  tomorrowFocus

CoachNote
  athleteId
  coachId
  date
  note
  ratings
  status

ModuleStatus
  moduleId
  maturity
  dataSources
  claimsAllowed
```

### 6.2 Optional/Future Entities

```text
CognitiveAssessment
  athleteId
  provider
  tournamentId
  attempt
  traitScores
  cohort
  benchmark

CogLeagueTournament
  season
  quarter
  cohortRules
  attemptsAllowed
  leaderboard
  rewards

GameFlowMatch
  matchId
  activeFootballTime
  preparationTime
  deadTime
  frictionIndex
  delayAttribution
```

## 7. Scoring Model

### 7.1 Score Families

```text
Daily IQ = weighted composite of readiness, mental, habits, recovery, and available performance data.
Readiness = sleep + fatigue + soreness + pain safety + stress + mood + load.
Mental Edge = confidence + focus + pressure control + motivation + stress reset + reflection quality.
Recovery = sleep + HRV + resting HR + soreness + pain + hydration + load balance.
Fuel = hydration + meal rhythm + protein/carbs/fat + pre/post-session support.
Habit Score = completed pillar habits / planned habits.
Score Confidence = completeness and reliability of available inputs.
```

### 7.2 Safety Overrides

Safety overrides should run after base scoring:

- High pain caps readiness and prevents green route.
- Injury status routes to coach check or recovery.
- Very low sleep prevents high-intensity recommendation.
- Low confidence/high stress simplifies cognitive load.
- Missing device data lowers confidence but does not block lifestyle mode.

### 7.3 Explainability

Each recommendation should expose:

- Input
- Rule
- Output

Example:

```text
Input: Sleep 6h + soreness high
Rule: Sleep gates high-risk physicality
Output: Amber day adapted session
```

## 8. MVP Boundary

### 8.1 Active Now

Should be treated as buildable/claimable:

- Athlete profile
- Daily check-in
- Lifestyle/performance mode
- Readiness score
- Mental Edge score
- Pain alerts
- Daily checklist
- Habit tracking
- Training log
- Calendar/day planner
- Coach notes
- Parent summary
- Team readiness overview
- Daily report
- Module status/truth layer

### 8.2 Lite / Manual Now

Can exist but must be labeled:

- Technical profile
- Physical profile
- Cognitive Lite
- Fuel guidance
- Wearable/manual sync
- Internal benchmark comparisons
- Recovery protocols
- Learning tasks

### 8.3 Future

Must not be overclaimed:

- Full cognitive assessment battery
- CogLeague tournaments
- Video-derived technical/tactical scoring
- GameFlow AI match intelligence
- Predictive development forecast
- Full sports lab integration
- Deep wearable integrations
- Local AI/Mac mini cluster
- Federated club/league intelligence

## 9. Duplication and Fine-Tuning Decisions

| Duplicate area | Sources | Problem | Canonical decision |
| --- | --- | --- | --- |
| Daily check-in | Wellness image, v4, v7, current Habigoal check-in | Same concept appears as 5-row wellness, detailed v4 check-in, and v7 check-in. | Use two modes: Lifestyle equals five-row wellness core; Performance adds detailed readiness/mental/load/device fields. |
| Daily score | v4 Daily IQ, v7 Daily IQ, current readiness | Multiple names for similar composite state. | Keep Daily IQ as high-level composite; keep Readiness as physical/training readiness subscore. |
| Mental pillar | text note, v4 mental, v7 mental | Same priority expressed repeatedly. | Mental/Psychology is MVP active, not future. |
| Cognitive | CogLeague, cognitive image, v7 Cognitive Lite | Risk of mixing full assessment and simple tasks. | Cognitive Lite is MVP/lite; CogLeague is separate partner/future module. |
| Learning | v4 Learning Hub, v7 Cognitive Lite, text note | Learning appears as both lessons and cognitive tasks. | Keep Learning Hub as short action lessons; Cognitive Lite can recommend learning tasks. |
| Reports | v4 Daily Report, v7 Report, AIQ reports | Report scope can overclaim. | Report only active modules; label lite/future modules clearly. |
| Wearables | v4 wearables, text note, ecosystem hardware | Device integrations appear as MVP temptation. | Manual sync first; Oura-like integration later behind confidence label. |
| Six-pillar platform | AIQ PDF, v7 roadmap, ecosystem image | Long-term platform can distort MVP. | Use six pillars as architecture; only some pillars active in MVP. |
| Match intelligence | GameFlow image, technical/tactical future | Could distract from daily OS. | Future match-intelligence module only. |
| Coach/team/parent | v7, AIQ PDF, ecosystem image | Multiple stakeholder surfaces share data. | One shared source of truth with role-specific renderers. |

## 10. Recommended Function Refinement for Existing Habigoal

The current Habigoal implementation already has many matching primitives: athlete profiles, check-ins, readiness scoring, habits, training load, dashboard views, reports, onboarding, GDS governance, and version audits.

Fine-tune by aligning the product functions as follows:

1. Rename user-facing surfaces from generic check-in/history toward the AthleteIQ daily loop where appropriate.
2. Keep the newly implemented athlete baseline setup as the first-login entry to the athlete profile.
3. Expand check-in into explicit Lifestyle/Performance modes instead of adding separate duplicated forms.
4. Add module maturity labels to reports and dashboards: Active, Lite, Planned, Future.
5. Make Daily IQ a composite derived from existing readiness, habits, load, and mental inputs.
6. Treat Mental Edge as a first-class score rather than a minor note field.
7. Add pain alert list support where only single pain/soreness fields exist.
8. Use current habit records as the daily to-do backbone.
9. Use current training/session logs as development history.
10. Keep CogLeague and GameFlow as documented future/partner modules until real contracts exist.

## 11. Functional Execution Order

### Phase 1: MVP Trust Layer

1. Active/lite/future module status registry.
2. Lifestyle/performance check-in mode.
3. Daily IQ composite score.
4. Mental Edge score.
5. Pain alert list and safety caps.
6. Daily report that labels data used and missing data.

### Phase 2: Daily OS Depth

1. Daily checklist from check-in state.
2. Habit score and streak surface.
3. Session recommendation and log loop.
4. Calendar/day planner.
5. Reflection memory.
6. Parent-safe summary.
7. Coach alert queue.
8. Team overview.

### Phase 3: Expansion Modules

1. Recovery protocols.
2. Fuel guidance.
3. Learning hub.
4. Wearable manual sync and later Oura-style integration.
5. Cognitive Lite.
6. Internal benchmarks.

### Phase 4: Strategic Modules

1. CogLeague partner integration.
2. Sports lab assessments.
3. Video-derived technical/tactical scoring.
4. GameFlow/match intelligence.
5. Predictive development forecast.
6. SaaS packaging and partner dashboards.

## 12. UX Principles Extracted from the Sources

- Always show what data was used.
- Always show what is missing.
- Never pretend future modules are active.
- Keep athlete-facing actions simple.
- Give coaches more detail than athletes.
- Give parents reassurance and next conversation, not raw analytics.
- Make pain a safety gate.
- Make mental state actionable, not just scored.
- Let lifestyle users provide less data.
- Reward repeat engagement through habits, tournaments, progress, and check-ins.
- Use gauges, badges, status colors, simple cards, and clear next actions.
- Convert assessment results into a journey, not a static score.

## 13. Operational Requirements

The ecosystem image and AIQ PDF imply non-code functions:

- Product management must own the active/lite/future truth table.
- QA must test score rules, safety caps, and missing-data states.
- Legal/privacy must govern youth athlete data and parent views.
- Sports science advisors must validate scoring claims.
- Customer success must support academies and coaches.
- Business development must separate SaaS, lab/testing, partner, and consumer packaging.
- Methodology/IP must define six-pillar scoring and micro-skill structures.

## 14. Open Questions

These are unresolved by the files and should not be guessed in implementation:

1. Exact scoring weights for Daily IQ.
2. Exact threshold cutoffs for green/amber/red routes.
3. Which age groups require parent/guardian consent workflows.
4. Whether CogMap/cogLeague data will be accessed by API, CSV import, or embedded partner dashboard.
5. Whether GameFlow AI is a real product dependency or only inspiration.
6. Which wearable integration comes first.
7. Whether AthleteIQ branding replaces or coexists with Habigoal branding.
8. Whether the six pillars should be Technical/Tactical/Cognitive/Physical/Mental/Readiness or Technical/Physical/Cognitive/Tactical/Mental/Recovery. The sources use both Readiness and Recovery.

## 15. Canonical Function Definition

AthleteIQ should be implemented as:

```text
An athlete development operating system that starts with a daily readiness and mental loop, converts check-ins and available context into safe next actions, explains what data was used, and grows through clearly labeled modules into a six-pillar player development platform.
```

The canonical function is not "collect data". It is:

```text
Data in -> state understood -> risk controlled -> next action generated -> progress tracked -> stakeholder view updated.
```

Everything else should support that loop.

