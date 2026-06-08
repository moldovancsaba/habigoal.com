# Athlete IQ 2.0 — Master Documentation Package

> Canonical normalized extract from source DOCX v3.0 (2026-06-07). Generated 2026-06-08.

**Source:** `AthleteIQ_2_Master_Documentation_Package.docx`

**Note:** Section numbers preserved from original document. Use `section-registry.json` for machine-readable index.

# ATHLETE IQ 2.0

AI-Powered Athlete Operating System - Master Documentation Package

Prepared for Athlete IQ / HabiGoal

2026-06-07

## 1 Table of Contents

Document Control

Executive Summary

Strategic Positioning

Product Vision

Core Principles

Business Objectives

Master System Overview

User Roles and Stakeholders

Athlete Digital Twin

Data Collection Layer

Cloud Data Platform

Local AI Processing Cluster

AI Intelligence Layer

Athlete Vision Platform

Performance Lab

Performance Dashboards

Injury Prevention Hub

Communication and Collaboration

Integrations and Ecosystem

Mobile App and Athlete Portal

Insights and Decision Support

High-Level Design

Reference Data Model

API Architecture

Security Architecture

Privacy First Architecture

GDPR and Youth Protection

AI Governance and AI Act Considerations

Health, Wellness and Medical Boundary

Delivery Roadmap

Commercial Model

Business Value by Module

Operational Model

Risks, Assumptions and Open Decisions

Detailed Functional and Non-Functional Requirements

Detailed Data Architecture

Detailed AI Pipeline

Legal and Compliance Operating Model

Medical and Safeguarding Governance

Product Analytics and Success Measurement

Testing and Quality Assurance

Implementation Team Structure

Customer Onboarding Plan

Procurement and Hardware Plan

Financial Model and Pricing Logic

Future Roadmap

Conclusion

Appendices and References

## 2 Document Control

| Item | Detail |
| --- | --- |
| Document title | ATHLETE IQ 2.0 - Master Documentation Package |
| Product | Athlete IQ / HabiGoal |
| Document type | Executive Business Proposal, High-Level Design, Technical Architecture, Product Roadmap, Privacy and Compliance Framework |
| Version | 3.0 |
| Status | Working master specification |
| Audience | Founders, investors, club executives, academy leaders, product team, engineering team, security reviewers, legal and compliance reviewers |
| Language | English, British spelling |
| Important limitation | This document is a product, technology and commercial design document. It is not legal, medical, financial or tax advice. Final deployment requires review by qualified legal counsel, DPO/privacy adviser, security lead and, where relevant, medical/regulatory specialists. |

## 3 Executive Summary

Athlete IQ 2.0 is an AI-powered athlete operating system designed to support football academies, professional clubs, national federations, sports schools, private performance centres, universities and elite athlete programmes.

The system converts fragmented athlete information into a unified, continuously updated Athlete Digital Twin. It combines human coaching expertise, daily athlete feedback, wearable data, photo analysis, video analysis, performance testing systems, communication workflows, dashboards, local AI processing and decision-support tools.

The central objective is to help coaches and organisations make better decisions. Athlete IQ does not replace coaches, medical staff or performance professionals. It organises athlete data, analyses trends, highlights risks, generates recommendations and provides structured insights for human decision-makers.

The platform is intentionally designed around a privacy-first architecture. Heavy AI processing runs on dedicated local infrastructure, such as a horizontally scalable Mac mini cluster. Athlete performance data does not need to be sent to external AI providers for routine processing. This creates a strong differentiator for youth environments, privacy-sensitive clubs, federations and international deployments.

The system supports a staged commercial and technical rollout. The first release can be delivered as a lean Athlete OS foundation, then expanded through wearable integrations, Digital Twin modelling, local AI, athlete vision, performance lab integrations, injury prevention, dashboards, communication and international compliance capability.

## 4 Strategic Positioning

Athlete IQ should not be positioned as a simple athlete tracking app, wearable dashboard, video analysis tool or coaching calendar. Those are components, not the category.

Athlete IQ should be positioned as:

An AI-Powered Athlete Operating System built around a continuously evolving Athlete Digital Twin.

This positioning is stronger because it sits above existing tools. Oura, Whoop, Garmin, Polar, GPS systems, force plates, video platforms and coach notes become data sources. Athlete IQ becomes the decision layer that interprets them.

### 4.1 Positioning Statement

Athlete IQ 2.0 unifies athlete data from every touchpoint, builds an evolving Digital Twin for each athlete and delivers privacy-first AI insights that help coaches, clubs and federations improve performance, reduce avoidable risk and accelerate long-term development.

### 4.2 Category Definition

| Category | Athlete IQ position |
| --- | --- |
| Wearable platform | Integrated data source, not the core product |
| GPS platform | Integrated performance device layer |
| Video analysis platform | One module within Athlete Vision |
| Coaching application | One user-facing operating workflow |
| Dashboard product | Presentation layer only |
| Athlete OS | Core category and preferred market position |

## 5 Product Vision

### 5.1 Current Problem

Athlete information is fragmented across many disconnected systems. A single player can have sleep data in Oura, HRV in Whoop, training load in Garmin, GPS load in Catapult, reaction data in BlazePod, video observations in a coaching platform, subjective wellness in a spreadsheet and injury notes in a physiotherapist’s notebook.

This creates several operational problems:

Coaches spend too much time collecting information.

Data is available but not converted into decisions.

Players receive inconsistent feedback.

Parents, where appropriate, see limited structured development information.

Clubs cannot easily compare cohorts, age groups or positions.

Performance, recovery and technical data are often analysed separately.

AI recommendations are difficult to trust without explainability and human control.

### 5.2 Athlete IQ Vision

Athlete IQ creates one continuously updated Digital Twin for every athlete. The Digital Twin combines historical data, current status, performance metrics, recovery patterns, technical development, cognitive signals and risk indicators into a structured athlete model.

The Digital Twin becomes the athlete’s evolving performance representation. It allows the platform to answer practical coaching questions:

Is the athlete ready to train today?

Is the athlete recovering properly?

Is training load increasing faster than recovery capacity?

Is technique improving or regressing?

Are asymmetries or movement changes emerging?

Which players need intervention?

Which players are developing faster than their cohort?

What should the coach do next?

## 6 Core Principles

### 6.1 Human First

Coaches, medical staff and performance professionals remain responsible for decisions. AI provides recommendations, confidence indicators, explanations and prioritised options. It does not automatically override human judgement.

### 6.2 Privacy First

The platform is designed so that sensitive athlete data can be processed on dedicated customer-controlled infrastructure. External AI providers are not required for routine athlete analysis.

### 6.3 Local AI First

Local AI is a strategic differentiator. The architecture favours local inference and batch processing, especially for video analysis, photo analysis, readiness calculation, injury risk indicators and recommendation generation.

### 6.4 Scalable First

The architecture must work for:

100 athletes.

1,000 athletes.

10,000 athletes.

Multiple clubs.

Multiple countries.

Federations and academy networks.

The preferred scaling model is horizontal scaling using processing nodes rather than replacing the system with a single larger machine.

### 6.5 API First

External systems must be replaceable. Integrations are implemented through standardised APIs, connector patterns and normalised internal data contracts.

### 6.6 Evidence and Explainability First

Recommendations must be explainable. Scores should not be black boxes. Each recommendation should show contributing factors, data recency, confidence level and whether human review is required.

## 7 Business Objectives

### 7.1 Primary Business Outcomes

| Outcome | Description |
| --- | --- |
| Better coaching decisions | Coaches receive prioritised, contextual recommendations rather than raw charts only. |
| Reduced preventable risk | Load, recovery, movement and wellness indicators help flag early risks. |
| Better athlete development | Longitudinal Digital Twin tracking supports development planning. |
| Higher operational efficiency | Reduces spreadsheet work and manual data consolidation. |
| Stronger academy visibility | Management can see trends across teams, age groups and cohorts. |
| Privacy-led differentiation | Local AI and data sovereignty support trust in youth and elite environments. |

### 7.2 Commercial Opportunity

Athlete IQ can be sold to clubs and academies as a subscription-based operating system rather than a one-off software project. The strongest commercial model is a SaaS licence combined with optional implementation fees, hardware deployment and enterprise support.

### 7.3 Value Proposition by Customer Type

| Customer | Value |
| --- | --- |
| Professional club | Better squad visibility, performance intelligence, injury risk indicators and staff collaboration. |
| Football academy | Long-term player development, parent reporting, youth protection and cohort benchmarking. |
| Federation | Population-level talent visibility, standardised data and national development analytics. |
| Private performance centre | Premium diagnostics, AI reporting and multi-client performance programmes. |
| University / sports school | Athlete development, research datasets and structured training insights. |
| Individual elite athlete | Personalised development, recovery and performance recommendations. |

## 8 Master System Overview

The full platform is organised into the following logical layers:

Data Collection Layer        ↓Cloud Data Platform        ↓Athlete Digital Twin Engine        ↓Local AI Processing Cluster        ↓AI Intelligence Layer        ↓Applications and Dashboards        ↓Decision Support and Athlete Development

## 9 User Roles and Stakeholders

### 9.1 Athlete

The athlete uses the mobile app or portal to complete daily check-ins, view recommendations, access training tasks, upload photos or videos, review progress and synchronise devices.

### 9.2 Coach

The coach plans training, rates sessions, reviews dashboards, receives AI recommendations and applies human judgement to training decisions.

### 9.3 Parent or Guardian

For youth athletes, the parent or guardian may approve data processing, view development reports and receive appropriate progress information depending on club policy and athlete age.

### 9.4 Performance Coach

The performance coach reviews physical metrics, readiness, recovery, training load, movement quality, testing results and performance trends.

### 9.5 Physiotherapist / Medical Staff

The physiotherapist reviews injury indicators, movement screening, recovery metrics and return-to-play support information. Athlete IQ should support the professional, not issue clinical diagnoses.

### 9.6 Analyst

The analyst reviews team trends, benchmarking, cohort performance and exported datasets.

### 9.7 Club Management

Management views club-wide analytics, academy metrics, adoption rates, injury trends, player development insights and strategic reporting.

### 9.8 System Administrator

The administrator manages roles, access, integrations, data retention, audit logs, security settings and deployment configuration.

## 10 Athlete Digital Twin

The Athlete Digital Twin is the core product asset. It is a dynamic representation of every athlete across five dimensions: Physical, Performance, Technical, Recovery and Cognitive.

The Digital Twin is not merely a profile record. It is a time-aware model that combines static data, daily data, event data, testing data, video-derived metrics and AI-generated features.

### 10.1 Digital Twin Objectives

Create a single source of truth for athlete development.

Track longitudinal changes across seasons and age groups.

Support readiness, recovery and development decisions.

Provide explainable context for AI recommendations.

Enable comparison across position, cohort, team and organisation.

Support privacy-controlled data portability and deletion.

### 10.2 Physical Twin

Tracks the athlete’s physical development and readiness.

| Component | Examples |
| --- | --- |
| Anthropometrics | Height, weight, age, skeletal maturity estimate where available, growth trends. |
| Body composition trends | Visual progress estimates, weight changes, development trends. |
| Strength and power | Max strength, estimated power output, force plate metrics, jump outputs. |
| Mobility and flexibility | Range of motion, mobility screening, movement quality. |
| Biometrics | Resting heart rate, HRV, general physiological status. |
| Physical readiness | Combined physical indicators supporting readiness scoring. |

### 10.3 Performance Twin

Tracks the athlete’s measurable performance capability.

| Component | Examples |
| --- | --- |
| Training load | Internal load, external load, RPE, ACWR, monotony and strain. |
| Speed | Sprint times, top speed, acceleration profile. |
| Power | Jump metrics, force plate data, explosive output. |
| Agility | Timing gate tests, reaction drills, movement tasks. |
| Match performance | GPS-derived workload, positional contribution and match metrics where available. |
| Benchmarking | Age, position and cohort comparisons. |

### 10.4 Technical Twin

Tracks football-specific technical and movement qualities.

| Component | Examples |
| --- | --- |
| Technique analysis | Sprint mechanics, running form, kicking mechanics, jump technique. |
| Skill assessment | Coach ratings, technical scoring, progress against objectives. |
| Tactical understanding | Positioning, spacing and tactical awareness notes. |
| Consistency | Repeated execution reliability across sessions. |
| Decision making | Coach observations, cognitive drills, on-field decision indicators. |
| Technical progression | Long-term skill development roadmap. |

### 10.5 Recovery Twin

Tracks recovery, fatigue and wellness.

| Component | Examples |
| --- | --- |
| Sleep | Duration, quality, efficiency, REM/deep sleep where available. |
| HRV | Trend, baseline deviation, readiness correlation. |
| Resting heart rate | Daily value and trend. |
| Mood and wellness | Self-reported wellness, stress and soreness. |
| Fatigue monitoring | Acute and chronic fatigue patterns. |
| Recovery readiness | Daily recovery score and recommendations. |

### 10.6 Cognitive Twin

Tracks mental readiness and decision-related performance.

| Component | Examples |
| --- | --- |
| Mood | Daily emotional state and trend. |
| Stress | Self-reported stress and physiological correlations. |
| Focus | Self-reported focus, cognitive drill results. |
| Reaction performance | BlazePod, FITLIGHT or similar devices. |
| Decision speed | Cognitive and reaction assessments. |
| Motivation and drive | Goal tracking, coach notes, engagement indicators. |

## 11 Data Collection Layer

The Data Collection Layer captures athlete-related data from human inputs, connected devices, media uploads and performance testing equipment.

### 11.1 Athlete Input

Daily check-in should be simple and fast. The purpose is not to collect everything, but to collect the minimum reliable subjective dataset that improves decision-making.

#### 11.1 .1Core Daily Check-In Fields

| Field | Type | Purpose |
| --- | --- | --- |
| Sleep quality | 1-5 or 1-10 scale | Subjective recovery indicator. |
| Mood | scale / category | Cognitive and emotional readiness signal. |
| Energy | scale | Daily readiness signal. |
| Soreness | body map / scale | Local fatigue and risk indicator. |
| Stress | scale | Recovery and mental load signal. |
| Training completion | percentage / yes-no | Compliance tracking. |
| Recovery feedback | free text / tags | Qualitative context. |
| Goals and notes | text | Athlete self-reflection and planning. |

#### 11.1 .2Optional Athlete Uploads

Daily or periodic progress photos.

Sprint videos.

Running videos.

Jump videos.

Kicking videos.

Strength exercise videos.

### 11.2 Coach Input

Coach input is essential because AI cannot understand every contextual factor from device data alone.

#### 11.2 .1Coach Data

| Data | Purpose |
| --- | --- |
| Training plans | Defines intended workload and development target. |
| Session plans | Supports periodisation and execution tracking. |
| Objectives | Links activity to short and long-term goals. |
| Session ratings | Human assessment of intensity, quality and completion. |
| Coach observations | Technical, tactical, behavioural and contextual notes. |
| Availability | Selection, injury, illness, travel and status context. |

### 11.3 Wearable Integrations

Wearable integrations provide continuous recovery and activity signals.

#### 11.3 .1Initial Wearable Targets

Oura.

Whoop.

Garmin.

Polar.

Fitbit.

Apple Health.

Google Health Connect.

#### 11.3 .2Typical Wearable Metrics

| Metric | Use |
| --- | --- |
| Sleep duration | Recovery and readiness calculation. |
| Sleep quality | Recovery trend analysis. |
| HRV | Autonomic recovery signal. |
| Resting heart rate | Fatigue and recovery context. |
| Activity | Daily load and lifestyle load. |
| Training load | Performance and fatigue modelling. |
| Calories / energy expenditure | Lifestyle and load context, where reliable. |
| Blood oxygen / temperature | Optional contextual signal, not diagnostic. |

### 11.4 Performance Devices

Performance devices provide objective testing and training data.

#### 11.4 .1Supported Device Categories

| Category | Examples | Metrics |
| --- | --- | --- |
| GPS systems | Catapult, STATSports, other GPS vests | Distance, high-speed distance, acceleration, deceleration, player load. |
| Timing gates | Brower, Freelap, similar | Sprint times, split times, acceleration curves. |
| Reaction lights | BlazePod, FITLIGHT | Reaction time, hit accuracy, cognitive readiness. |
| Force plates | VALD, Hawkin Dynamics, similar | Peak force, jump height, asymmetry, power. |
| Other sensors | Extensible | Device-specific metrics normalised through connector contracts. |

### 11.5 Athlete Vision Data

Vision data covers photos and videos. It should be used for trend detection, technical analysis and performance development, not for medical diagnosis.

#### 11.5 .1Supported Media

Progress photos.

Posture/alignment photos.

Sprint videos.

Running videos.

Jump videos.

Kicking videos.

Strength exercise videos.

#### 11.5 .2Design Controls

Require explicit consent for media processing.

Avoid facial recognition unless separately justified and legally reviewed.

Store media securely in object storage.

Store derived pose landmarks and metrics separately from raw media.

Provide retention and deletion controls.

## 12 Cloud Data Platform

The Cloud Data Platform is the operational system of record. It stores data, serves applications, manages integrations and synchronises with the local AI cluster.

### 12.1 API and Service Layer

#### 12.1 .1Responsibilities

Authentication.

Authorisation.

Role-based access control.

Input validation.

Business rules.

Device connectors.

Data ingestion.

Webhook handling.

Notifications.

Audit logging.

#### 12.1 .2Recommended Technologies

| Component | Recommended option | Alternative |
| --- | --- | --- |
| Web application | Next.js / React | Vue / Angular |
| API backend | Node.js / NestJS | FastAPI / Django |
| AI worker API | Python FastAPI | Flask / gRPC service |
| Authentication | OAuth2 / OIDC | Auth0, Clerk, Keycloak, custom identity service |
| Queue gateway | RabbitMQ / Redis Queue | Kafka, SQS-compatible queue |
| Notifications | Email/push/SMS provider | Provider-agnostic abstraction |

### 12.2 Operational Database

The operational database stores live platform data.

#### 12.2 .1Recommended Base Option

MongoDB Atlas or self-managed MongoDB can be used for flexible athlete documents, wearable payloads and evolving AI outputs. MongoDB supports role-based access control patterns suitable for separating user privileges and operational functions.

#### 12.2 .2Alternative Option

PostgreSQL is also suitable if the engineering team prefers a relational model, strict transactional workflows and SQL analytics. A hybrid model is acceptable: PostgreSQL for core entities and MongoDB for semi-structured device data.

#### 12.2 .3Core Entities

Organisation.

Club.

Team.

Athlete.

Coach.

Parent / guardian.

User account.

Role.

Consent record.

Daily check-in.

Training plan.

Session.

Device account.

Device metric.

Media asset.

AI job.

AI output.

Recommendation.

Audit event.

### 12.3 Object Storage

Object storage is used for large files and artefacts.

#### 12.3 .1Stores

Photos.

Videos.

Uploaded documents.

Generated PDF reports.

AI model artefacts.

Exported data.

Intermediate processing artefacts where needed.

#### 12.3 .2Recommended Technology

S3-compatible storage. Options include AWS S3, MinIO, Wasabi, Cloudflare R2 or other S3-compatible providers depending on deployment policy.

### 12.4 Data Warehouse

The warehouse stores long-term analytical data.

#### 12.4 .1Stores

Historical athlete metrics.

Season aggregates.

Multi-season development trends.

Benchmarking datasets.

Research datasets.

Reporting marts.

#### 12.4 .2Recommended Options

Snowflake.

BigQuery.

PostgreSQL analytical replica.

DuckDB/Parquet for early-stage analytics.

### 12.5 Data Flow and Synchronisation

Collect → Validate → Normalise → Store → Sync → Analyse → Report

#### 12.5 .1Key Data Rules

Raw external payloads should be preserved for audit and reprocessing.

Normalised records should use a stable internal schema.

AI outputs should be versioned by model, feature set and processing date.

Derived scores must be explainable and reproducible.

Sensitive data must be encrypted in transit and at rest.

## 13 Local AI Processing Cluster

The Local AI Processing Cluster is the platform’s major architectural differentiator. It allows advanced AI workloads to run locally under the organisation’s control.

### 13.1 Why Local AI Matters

Local AI supports:

Data sovereignty.

Predictable infrastructure costs.

Reduced third-party dependency.

Offline and low-connectivity deployments.

Better control of youth athlete data.

Reduced exposure to external AI provider terms.

### 13.2 Processing Model

The system is designed around nightly batch processing. Speed is secondary to throughput and reliability. The goal is that data submitted during the day is processed overnight and available to coaches the next morning.

This avoids the cost and complexity of real-time AI infrastructure.

### 13.3 Initial Hardware Configuration

#### 13.3 .1Pilot Node

1x Mac mini M4 Pro.

48 GB unified memory.

1 TB SSD minimum.

10Gb Ethernet preferred.

This configuration is suitable for a pilot or small academy environment where video volumes are moderate and processing can run overnight.

### 13.4 Scaled Hardware Configuration

#### 13.4 .1Multi-node Cluster

2-4 Mac mini nodes for larger academy pilots.

8-20 nodes for multi-club or federation-scale batch processing.

100+ nodes possible if the job queue and orchestration model are designed correctly.

### 13.5 Why Horizontal Scaling

A single large workstation can be powerful, but it creates a single point of failure. Multiple smaller nodes provide resilience, easier expansion and better cost control.

| Model | Risk | Advantage |
| --- | --- | --- |
| One large machine | Failure stops all processing | High single-node performance |
| Multiple Mac mini nodes | One node failure reduces capacity only | Better resilience and modular growth |

### 13.6 Processing Queue

The queue distributes jobs to available nodes.

#### 13.6 .1Queue Responsibilities

Job scheduling.

Priority handling.

Retry handling.

Dead-letter queue.

Workload balancing.

Node health awareness.

Progress reporting.

#### 13.6 .2Job Types

Wearable data processing.

Daily check-in scoring.

Photo analysis.

Video analysis.

Performance device normalisation.

Digital Twin update.

Recommendation generation.

Report generation.

### 13.7 Processing Nodes

Each node runs the same worker software. Nodes pull jobs from the queue, process them and push results back to the operational database or object storage.

#### 13.7 .1Node Capabilities

AI model inference.

Computer vision processing.

Feature extraction.

Recommendation generation.

Report generation.

Health monitoring.

## 14 AI Intelligence Layer

The AI Intelligence Layer turns raw and normalised data into decisions.

### 14.1 Readiness Engine

#### 14.1 .1Question Answered

Can the athlete train today, and if so, at what intensity?

#### 14.1 .2Inputs

Sleep.

HRV.

Resting heart rate.

Daily wellness.

Soreness.

Training load.

Recent sessions.

Coach notes.

#### 14.1 .3Outputs

Readiness score.

Readiness trend.

Load tolerance indication.

Fatigue warning.

Confidence level.

Recommended training adjustment.

### 14.2 Recovery Engine

#### 14.2 .1Question Answered

Has the athlete recovered sufficiently?

#### 14.2 .2Inputs

Sleep duration and quality.

HRV trend.

Resting heart rate.

Mood.

Stress.

Soreness.

Previous training load.

#### 14.2 .3Outputs

Recovery score.

Recovery trend.

Recovery drivers.

Recovery optimisation recommendations.

### 14.3 Development Engine

#### 14.3 .1Question Answered

Is the athlete improving over time?

#### 14.3 .2Inputs

Testing results.

Training history.

Coach ratings.

Technical analysis.

Digital Twin trends.

Cohort benchmarks.

#### 14.3 .3Outputs

Development report.

Progress trend.

Potential assessment.

Benchmark comparison.

Development roadmap.

### 14.4 Technique Engine

#### 14.4 .1Question Answered

Is the athlete’s movement or football technique improving?

#### 14.4 .2Inputs

Sprint videos.

Running videos.

Jump videos.

Kicking videos.

Pose landmarks.

Historical technique scores.

#### 14.4 .3Outputs

Movement quality score.

Technique observations.

Symmetry indicators.

Technical progression trend.

Corrective recommendations.

### 14.5 Injury Risk Engine

#### 14.5 .1Question Answered

Are there signs that the athlete may need reduced load, additional recovery or professional review?

#### 14.5 .2Inputs

Load trends.

Recovery trends.

HRV deviation.

Sleep quality.

Soreness.

Movement asymmetry.

Injury history.

Coach observations.

#### 14.5 .3Outputs

Injury risk indicator.

Risk factors.

Early warning alerts.

Suggested prevention plan.

Human review requirement.

#### 14.5 .4Medical Boundary

The Injury Risk Engine must not claim to diagnose, treat or clinically predict medical injury. It should provide sport performance risk indicators and recommend human review where required.

### 14.6 Recommendation Engine

#### 14.6 .1Question Answered

What should happen next?

#### 14.6 .2Outputs

Coach recommendations.

Athlete recommendations.

Training load adjustments.

Recovery suggestions.

Technical focus areas.

Session planning suggestions.

Confidence indicators.

## 15 Athlete Vision Platform

The Athlete Vision Platform analyses photos and videos using computer vision.

### 15.1 Technology Options

| Technology | Role |
| --- | --- |
| OpenCV | Video processing, frame extraction, image operations. |
| MediaPipe Pose Landmarker | Human pose landmark detection from image or video. |
| YOLO / Ultralytics pose models | Alternative or supplementary pose/keypoint detection. |
| RTMPose / MoveNet | Alternative pose estimation models for experimentation. |
| Local LLM | Textual feedback and report generation. |

### 15.2 Photo Analysis

#### 15.2 .1Purpose

Long-term visual development tracking.

#### 15.2 .2Measures

Posture trends.

Alignment.

Asymmetry indicators.

Visual progress.

Body change trends.

#### 15.2 .3Limits

Photo analysis must not provide medical diagnosis, precise body-fat diagnosis or psychological diagnosis. It can provide visual trend indicators and coaching-support observations.

### 15.3 Sprint Analysis

#### 15.3 .1Measures

Acceleration phase.

Stride length.

Stride frequency.

Top speed indicators.

Body angle.

Arm swing.

Efficiency score.

### 15.4 Running Analysis

#### 15.4 .1Measures

Running form.

Cadence.

Ground contact indicators.

Energy efficiency.

Injury risk indicators.

### 15.5 Jump Analysis

#### 15.5 .1Measures

Jump height estimate.

Take-off technique.

Landing mechanics.

Power output estimate.

Stability.

### 15.6 Kicking Analysis

#### 15.6 .1Measures

Approach angle.

Plant foot position.

Hip rotation.

Contact mechanics.

Follow-through.

Accuracy and consistency indicators where target data exists.

## 16 Performance Lab

The Performance Lab integrates specialised football and performance devices.

### 16.1 GPS Systems

#### 16.1 .1Metrics

Total distance.

High-speed running.

Sprint count.

Accelerations.

Decelerations.

Player load.

Position-specific workload.

### 16.2 Timing Gates

#### 16.2 .1Metrics

5m, 10m, 20m and 30m split times.

Acceleration profile.

Agility test times.

Reaction start time where supported.

### 16.3 BlazePod

#### 16.3 .1Metrics

Reaction time.

Hit accuracy.

Drill performance.

Cognitive readiness trend.

### 16.4 FITLIGHT

#### 16.4 .1Metrics

Response time.

Cognitive-agility tasks.

Drill score.

Progress tracking.

### 16.5 Force Plates

#### 16.5 .1Metrics

Peak force.

Power output.

Jump height.

Landing force.

Left/right asymmetry.

## 17 Performance Dashboards

Dashboards turn intelligence into usable decisions. Dashboard design should follow the style already validated in the visual deck: clean, metric-led, high contrast, role-specific and focused on action.

### 17.1 Overview Dashboard

Shows executive-level KPIs:

Team readiness.

Injury risk distribution.

Training load.

Recovery status.

Top alerts.

Weekly trend.

### 17.2 Athlete Dashboard

Shows individual athlete view:

Readiness.

Recovery.

Performance radar.

Recent sessions.

Injury status.

Notes and recommendations.

### 17.3 Team Dashboard

Shows squad-level data:

Team readiness.

Load distribution.

Position analysis.

Injury overview.

Compliance.

### 17.4 Training Dashboard

Shows planning and execution:

Calendar.

Session plans.

Training load.

Session breakdown.

Drill library.

Compliance tracking.

### 17.5 Analytics Dashboard

Shows deeper analysis:

Benchmarking.

Correlation analysis.

Predictive modelling.

Custom reports.

Filters by age, position, team and time period.

## 18 Injury Prevention Hub

The Injury Prevention Hub is a dedicated operational module for monitoring risk signals and supporting prevention workflows.

### 18.1 Risk Assessment

Combines:

Load.

Recovery.

Movement quality.

Injury history.

Fatigue.

Coach observations.

### 18.2 Load Monitoring

Tracks:

Acute load.

Chronic load.

ACWR.

Load monotony.

Load strain.

Session impact.

### 18.3 Movement Screening

Tracks:

Movement quality.

Asymmetry.

Mobility limitations.

Compensation patterns.

Screening history.

### 18.4 Recovery Monitoring

Tracks:

Recovery score.

Sleep.

HRV.

Stress.

Muscle fatigue.

Recovery trends.

### 18.5 Prevention Strategies

Outputs:

Personalised prevention plan.

Exercise recommendations.

Recovery protocols.

Load management guidelines.

Education and tips.

Progress tracking.

## 19 Communication and Collaboration

Communication tools make the system operational, not just analytical.

### 19.1 Team Messaging

Features:

Individual messaging.

Team channels.

Department channels.

File sharing.

Read receipts.

Message search.

Push notifications.

### 19.2 Scheduling and Planning

Features:

Training calendar.

Session assignment.

Availability check.

Reminders.

Calendar sync.

Plan analytics.

### 19.3 Reporting and Sharing

Features:

Custom reports.

PDF export.

Excel export.

CSV export.

Report templates.

Report history.

Access-controlled sharing.

### 19.4 Video Communication

Features:

Remote consultations.

Staff meetings.

Athlete reviews.

Screen sharing.

Meeting recording where legally permitted.

### 19.5 Role and Access Management

Features:

Role-based permissions.

User management.

Invite management.

Audit logs.

Permission synchronisation.

## 20 Integrations and Ecosystem

The system should be open and extensible.

### 20.1 Integration Types

| Type | Examples |
| --- | --- |
| Wearables | Oura, Whoop, Garmin, Polar, Fitbit. |
| Health platforms | Apple Health, Google Health Connect. |
| GPS and performance | Catapult, PlayerMaker, STATSports and similar. |
| Scheduling | Google Calendar, Microsoft 365. |
| Reporting | CSV, XLSX, PDF, JSON. |
| Custom enterprise | Federation systems, club CRMs, internal databases. |

### 20.2 Open API

The platform should expose an authenticated REST API for custom integrations.

#### 20.2 .1API Design Principles

Versioned endpoints.

Token-based authentication.

Rate limiting.

Webhook support.

Idempotent ingestion endpoints.

Audit logging.

Clear data contracts.

## 21 Mobile App and Athlete Portal

The mobile app is the athlete’s daily interface. The portal is the broader self-service environment.

### 21.1 Mobile App Features

Daily check-in.

Training tasks.

Recommendations.

Recovery status.

Device sync status.

Notifications.

Messaging.

Photo/video upload.

Offline mode.

### 21.2 Athlete Portal Features

Profile.

Goals.

Development reports.

Training history.

Resource library.

Device management.

Data export.

### 21.3 Offline and Travel Mode

Offline mode is important for camps, travel, stadium environments and poor connectivity.

Required behaviour:

Local capture of check-ins.

Deferred upload.

Conflict handling.

Sync status display.

Security controls for cached data.

## 22 Insights and Decision Support

Decision support is the business value layer.

### 22.1 AI Insights Engine

Produces:

Patterns.

Trends.

Root-cause hypotheses.

Correlations.

Confidence indicators.

Natural language explanations.

### 22.2 Scenario Analysis

Allows coaches to compare options:

Maintain load.

Reduce load.

Recovery day.

Technical session.

Return-to-play progression.

### 22.3 Team Intelligence

Provides:

Team analytics.

Player comparison.

Role optimisation.

Strengths and gaps.

Benchmarking.

### 22.4 Strategic Planning

Provides:

Goal setting.

Action planning.

Progress milestones.

KPI tracking.

Review and adjust workflows.

### 22.5 Predictive Intelligence

Provides:

Performance forecasting.

Injury risk forecasting.

Peak prediction.

Early warning indicators.

Data-driven planning.

## 23 High-Level Design

### 23.1 Logical Component Model

Client Applications  - Mobile app / PWA  - Coach dashboard  - Club dashboard  - Admin portal        ↓API and Service Layer  - Auth  - Business logic  - Integrations  - Data validation        ↓Cloud Data Platform  - Operational DB  - Object storage  - Data warehouse        ↓Processing Queue        ↓Local AI Cluster  - Worker nodes  - Vision models  - Local LLM  - Scoring engines        ↓AI Outputs  - Scores  - Alerts  - Recommendations  - Reports        ↓Applications and Dashboards

### 23.2 Deployment Model

The default deployment uses a cloud-hosted application and database with local AI processing infrastructure.

| Layer | Deployment |
| --- | --- |
| Mobile/web app | Cloud-hosted web application / PWA. |
| API services | Cloud-hosted. |
| Operational database | Cloud database or managed database. |
| Object storage | S3-compatible storage. |
| Data warehouse | Cloud or managed analytics database. |
| Local AI cluster | On-premise or private environment. |
| Monitoring | Central logging and node monitoring. |

### 23.3 Data Synchronisation Pattern

Athlete or device sends data to the API.

API validates and stores raw and normalised data.

Processing job is created.

Local AI node pulls job metadata.

Local AI node retrieves authorised data/files.

Node processes data locally.

Node writes derived metrics, scores and reports back.

Dashboards display results.

## 24 Reference Data Model

### 24.1 Core Entity Overview

| Entity | Description |
| --- | --- |
| Organisation | Top-level customer entity. |
| Club | Club or academy under an organisation. |
| Team | Squad, age group or programme. |
| Athlete | Individual athlete profile. |
| User | Login account. |
| Role | Permission set. |
| Consent | Consent/legal basis record. |
| DeviceConnection | External device link. |
| Metric | Normalised measurement. |
| Session | Training or match session. |
| MediaAsset | Photo or video file metadata. |
| AIJob | Processing job. |
| AIOutput | AI result linked to model/version. |
| Recommendation | Human-readable recommended action. |
| AuditEvent | Security and activity event. |

### 24.2 Sample Athlete Object

{  "athleteId": "ath_123",  "organisationId": "org_001",  "teamId": "team_u17",  "profile": {    "name": "Example Athlete",    "dateOfBirth": "2009-04-20",    "position": "Midfielder",    "dominantFoot": "Right"  },  "digitalTwin": {    "physical": {},    "performance": {},    "technical": {},    "recovery": {},    "cognitive": {}  },  "privacy": {    "guardianConsentRequired": true,    "consentStatus": "active"  }}

### 24.3 Sample AI Output Object

{  "outputId": "out_001",  "athleteId": "ath_123",  "engine": "readiness",  "modelVersion": "readiness-v1.2",  "score": 81,  "confidence": "medium",  "factors": ["sleep_quality", "hrv_trend", "training_load"],  "recommendation": "Train normal with managed intensity.",  "humanReviewRequired": false,  "createdAt": "2026-06-07T06:00:00Z"}

## 25 API Architecture

### 25.1 API Principles

Resource-oriented REST endpoints.

JSON payloads.

OpenAPI documentation.

OAuth2/OIDC authentication.

Role-based authorisation.

Organisation and tenant isolation.

Idempotent ingestion.

Rate limits.

Audit logging.

### 25.2 Example Endpoint Groups

| Group | Example endpoints |
| --- | --- |
| Athletes | GET /athletes, POST /athletes, GET /athletes/{id} |
| Check-ins | POST /athletes/{id}/checkins, GET /athletes/{id}/checkins |
| Devices | POST /devices/connect, GET /devices/{id}/metrics |
| Media | POST /media/upload-url, GET /media/{id} |
| AI jobs | POST /ai/jobs, GET /ai/jobs/{id} |
| Scores | GET /athletes/{id}/scores/readiness |
| Reports | POST /reports, GET /reports/{id} |
| Consent | POST /consents, GET /athletes/{id}/consents |
| Audit | GET /audit/events |

## 26 Security Architecture

### 26.1 Security Objectives

Protect athlete data.

Protect youth data.

Prevent unauthorised access.

Maintain auditability.

Ensure secure integration.

Support regulatory review.

### 26.2 Authentication

OAuth2 / OIDC.

Multi-factor authentication for staff and admins.

Strong password policy.

Session expiry.

Device management.

### 26.3 Authorisation

Role-based access control.

Organisation-level tenant isolation.

Team-level permissions.

Athlete-level permissions where required.

Parent/guardian access limits.

### 26.4 Encryption

TLS 1.2+ or TLS 1.3 in transit.

AES-256 or equivalent at rest.

Encrypted backups.

Secrets stored in a secrets manager.

### 26.5 Audit Logging

Track:

Login events.

Failed access attempts.

Data views.

Data exports.

Consent changes.

Permission changes.

AI output creation.

Administrative actions.

### 26.6 Backups and Disaster Recovery

Automated backups.

Backup encryption.

Regular restore tests.

Recovery time objective and recovery point objective defined per customer tier.

## 27 Privacy First Architecture

### 27.1 Data Ownership

#### 27.1 .1Athlete Data

Athletes retain rights over their personal data, subject to applicable law and contract structure.

#### 27.1 .2Club Data

Clubs own operational club data, training plans, internal notes and organisational structures.

#### 27.1 .3No Data Resale

Athlete IQ should not sell athlete data.

#### 27.1 .4No Advertising Model

Athlete IQ should not monetise athlete data through advertising.

### 27.2 Data Minimisation

Collect only what is required for the stated development, performance and operational purposes.

### 27.3 Purpose Limitation

Data collected for athlete development should not be reused for unrelated purposes without a lawful basis and transparent communication.

### 27.4 Retention

Retention should be configurable by organisation and comply with legal, contractual and safeguarding obligations.

### 27.5 Deletion and Export

The system should support:

Export rights.

Deletion rights.

Right to be forgotten workflows.

Media deletion.

Derived data handling policy.

## 28 GDPR and Youth Protection

### 28.1 Legal Basis

The legal basis for processing must be determined by qualified counsel per deployment. Possible bases may include contract, legitimate interests, consent and explicit consent for special category data where applicable.

### 28.2 Special Category Data

Some wellness, HRV, sleep, injury and physiological data may be considered health-related data. Extra safeguards are required.

### 28.3 Children and Youth Athletes

Youth deployments require additional controls:

Parent or guardian approval where required.

Age-based access rules.

Child-friendly privacy notices.

Clear withdrawal mechanisms.

Minimised visibility of sensitive data.

### 28.4 Data Subject Rights

The platform should support:

Right of access.

Right to rectification.

Right to portability.

Right to erasure.

Right to restriction.

Right to object where applicable.

### 28.5 DPIA

A Data Protection Impact Assessment should be completed before production deployment, especially because the product may process sensitive data, youth data, behavioural data, performance data and media.

## 29 AI Governance and AI Act Considerations

### 29.1 AI Governance Principles

Human oversight.

Explainable outputs.

Confidence scoring.

Model versioning.

Logging.

Risk management.

Bias testing.

Monitoring after deployment.

### 29.2 Automated Decision Controls

Athlete IQ should not make fully automated decisions that produce legal or similarly significant effects on athletes. Recommendations should be advisory and subject to human review.

### 29.3 AI Act Considerations

The EU AI Act requires risk-based analysis. Athlete IQ should undergo formal classification review before EU launch. Modules that influence training, youth development, injury risk or selection decisions should be carefully assessed.

### 29.4 Model Documentation

Each model should have:

Purpose.

Input data.

Output data.

Known limitations.

Evaluation metrics.

Version.

Deployment date.

Owner.

Monitoring plan.

## 30 Health, Wellness and Medical Boundary

Athlete IQ should be defined as a performance, wellness and coaching decision-support platform.

It should not be marketed as:

A diagnostic medical device.

A treatment recommendation system.

A replacement for physiotherapists, doctors or qualified health professionals.

A definitive injury prediction system.

### 30.1 Product Language to Use

Use:

Readiness indicator.

Recovery signal.

Injury risk indicator.

Movement quality observation.

Human review recommended.

Performance development trend.

Avoid:

Diagnoses injury.

Prevents injury with certainty.

Detects disease.

Treats medical conditions.

Replaces medical review.

### 30.2 Regulatory Boundary

If Athlete IQ is later marketed for medical diagnosis, treatment, prevention of disease or clinical decision-making, the product may require assessment under medical device software rules.

## 31 Delivery Roadmap

### 31.1 Delivery Strategy

The recommended approach is staged delivery. Do not attempt to build the complete 18-page vision in one release. Build the operating foundation first, then add high-value AI and hardware modules.

### 31.2 Phase 0 - Discovery, Product Definition and Compliance Blueprint

| Item | Detail |
| --- | --- |
| Duration | 2-3 weeks |
| Purpose | Confirm product scope, pilot customers, data sources, legal assumptions and delivery plan. |
| Deliverables | Final PRD, HLD baseline, data inventory, DPIA starter pack, pilot success criteria. |
| Business value | Reduces rework and legal/technical ambiguity. |

### 31.3 Phase 1 - Athlete OS Foundation

| Item | Detail |
| --- | --- |
| Duration | 8 weeks |
| Deliverables | Athlete management, coach management, teams, daily check-ins, core dashboard, basic recommendations. |
| Business value | First usable platform for clubs and pilot athletes. |
| Acceptance criteria | Athletes can check in daily; coaches can review basic readiness and training completion. |

### 31.4 Phase 2 - Wearable Ecosystem

| Item | Detail |
| --- | --- |
| Duration | 8 weeks |
| Deliverables | Oura, Whoop, Garmin, Polar, Apple Health, Google Health Connect and Fitbit connector framework. |
| Business value | Automatic recovery and activity signals reduce manual entry. |
| Acceptance criteria | Device data is ingested, normalised, visible and used in recovery/readiness scores. |

### 31.5 Phase 3 - Cloud Data Platform and Digital Twin Foundation

| Item | Detail |
| --- | --- |
| Duration | 10 weeks |
| Deliverables | Operational database, object storage, data warehouse design, Digital Twin schema, historical trend layer. |
| Business value | Creates the long-term data asset. |
| Acceptance criteria | Each athlete has a Digital Twin record updated from daily and device data. |

### 31.6 Phase 4 - Local AI Cluster

| Item | Detail |
| --- | --- |
| Duration | 6-8 weeks |
| Deliverables | Processing queue, worker nodes, job orchestration, monitoring, first local model deployment. |
| Business value | Privacy-first AI differentiator and predictable processing costs. |
| Acceptance criteria | Nightly jobs run locally and write results back to the cloud platform. |

### 31.7 Phase 5 - AI Intelligence Layer

| Item | Detail |
| --- | --- |
| Duration | 8 weeks |
| Deliverables | Readiness Engine, Recovery Engine, Development Engine, Recommendation Engine, explainability layer. |
| Business value | Turns data into coach actions. |
| Acceptance criteria | Coaches receive explainable recommendations with confidence levels. |

### 31.8 Phase 6 - Athlete Vision

| Item | Detail |
| --- | --- |
| Duration | 12 weeks |
| Deliverables | Photo analysis, video upload, frame extraction, pose detection, sprint/running/jump/kicking analysis MVP. |
| Business value | Major differentiator and visible AI value. |
| Acceptance criteria | Uploaded videos are analysed overnight and produce movement observations. |

### 31.9 Phase 7 - Performance Lab

| Item | Detail |
| --- | --- |
| Duration | 10 weeks |
| Deliverables | GPS, timing gates, BlazePod, FITLIGHT, force plate connector patterns and normalised metrics. |
| Business value | Supports premium clubs and academies with existing performance equipment. |
| Acceptance criteria | Device data is imported, normalised and available in the Digital Twin. |

### 31.10 Phase 8 - Performance Dashboards, Mobile Portal and Communication

| Item | Detail |
| --- | --- |
| Duration | 10 weeks |
| Deliverables | Athlete dashboard, coach dashboard, team dashboard, messaging, calendar, reporting, athlete portal. |
| Business value | Makes the system operational for everyday club use. |
| Acceptance criteria | Different roles receive relevant dashboards and can communicate within permission boundaries. |

### 31.11 Phase 9 - Injury Prevention Hub

| Item | Detail |
| --- | --- |
| Duration | 8 weeks |
| Deliverables | Risk assessment, load monitoring, movement screening, recovery monitoring, prevention plan workflow. |
| Business value | High-value module for clubs, parents and performance departments. |
| Acceptance criteria | At-risk athletes are flagged with explainable factors and human review workflows. |

### 31.12 Phase 10 - Integrations, Ecosystem and Internationalisation

| Item | Detail |
| --- | --- |
| Duration | 8 weeks |
| Deliverables | Open API, exports, role model hardening, multilingual readiness, multi-country deployment controls. |
| Business value | Enables enterprise sales and federations. |
| Acceptance criteria | Data exports, APIs and international settings work under admin control. |

### 31.13 Phase 11 - Go-Live, Security Hardening and Operational Support

| Item | Detail |
| --- | --- |
| Duration | 4-6 weeks |
| Deliverables | Security review, DPIA completion support, monitoring, backups, support model, onboarding playbooks. |
| Business value | Production readiness. |
| Acceptance criteria | Pilot customer can operate the system safely with support and monitoring. |

## 32 Indicative Commercial Model

### 32.1 Development Programme

| Item | Value |
| --- | --- |
| Baseline development value | 120,000 EUR + VAT |
| Strategic early-adopter discount | 50% |
| Discounted early-adopter development value | 60,000 EUR + VAT |
| Indicative timeline | 12-14 months for baseline scope; 14-18 months for the broader 18-page vision depending on parallelisation and team size |

The discounted price should be tied to reference-customer rights, staged delivery, defined scope and a minimum subscription commitment.

### 32.2 SaaS Licensing

| Plan | Athlete limit | Monthly fee |
| --- | --- | --- |
| Starter | Up to 50 athletes | 999 EUR/month |
| Academy | Up to 250 athletes | 1,999 EUR/month |
| Professional | Up to 1,000 athletes | 3,999 EUR/month |
| Enterprise | Custom | Custom pricing |

### 32.3 Hardware Model

| Option | Description |
| --- | --- |
| Customer-owned hardware | Club purchases Mac mini / cluster hardware. Athlete IQ deploys and maintains software. |
| Hardware-as-a-service | Athlete IQ provides hardware and includes cost in monthly fee. |
| Hybrid | Customer owns base hardware; Athlete IQ supplies additional nodes for peak processing. |

### 32.4 Suggested Contract Structure

Minimum 24-month SaaS term for discounted early adopters.

Implementation paid in milestones.

Hardware billed separately unless included in package.

Third-party device/API fees excluded unless expressly included.

Legal review, DPO review and medical regulatory review excluded unless separately contracted.

## 33 Business Value by Module

| Module | Business value |
| --- | --- |
| Daily check-ins | Fast subjective readiness data. |
| Wearables | Reduces manual input and improves recovery modelling. |
| Digital Twin | Creates defensible long-term data asset. |
| Local AI | Differentiates through privacy, cost predictability and sovereignty. |
| Athlete Vision | High-impact visual AI capability. |
| Performance Lab | Integrates elite hardware used by professional clubs. |
| Injury Prevention | High-value operational and safeguarding module. |
| Dashboards | Converts complex data into daily decisions. |
| Mobile Portal | Drives athlete adoption. |
| Open API | Supports enterprise and federation sales. |

## 34 Operational Model

### 34.1 Support Levels

| Level | Description |
| --- | --- |
| L1 | User support, access issues, device connection issues. |
| L2 | Application support, data ingestion issues, dashboard issues. |
| L3 | Engineering support, AI pipeline issues, infrastructure incidents. |
| Compliance support | DPO/legal coordination, audit exports, consent history. |

### 34.2 Monitoring

Monitor:

API uptime.

Database health.

Queue depth.

AI job failures.

Processing time per job.

Node health.

Storage usage.

Authentication failures.

Error rates.

### 34.3 KPIs

| KPI | Target |
| --- | --- |
| Daily check-in completion | >80% for active athletes. |
| Wearable sync success | >95% for connected accounts. |
| Nightly processing completion | Before morning dashboard window. |
| AI job failure rate | <2% after stabilisation. |
| Coach dashboard usage | Weekly active coach usage >75%. |
| Athlete engagement | Weekly active athlete usage >70%. |

## 35 Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Device API limitations | Use connector abstraction and prioritise stable integrations. |
| Video processing volume | Batch processing, queue prioritisation and horizontal node scaling. |
| Legal complexity with youth data | DPIA, parent consent, age-based access and legal review. |
| Medical device boundary | Avoid diagnostic claims and maintain coaching-support positioning. |
| AI trust issues | Explainability, confidence scores and human-in-the-loop workflows. |
| Data quality issues | Validation, missing data flags and confidence scoring. |
| Adoption risk | Simple athlete check-in, coach-first dashboards and onboarding. |
| Hardware availability | Support alternative Mac Studio or server deployment options. |
| International deployment | Data residency controls and local legal review per jurisdiction. |

## 36 Assumptions

The existing local nightly AI system already works and will be extended rather than replaced.

The application does not require real-time AI responses for most workloads.

Batch processing overnight is acceptable.

Speed is secondary to throughput and reliability.

The customer accepts local hardware deployment or local processing environment.

The product remains a coaching and performance decision-support system, not a medical diagnostic device.

Legal basis and consent models will be reviewed before go-live.

## 37 Open Decisions

| Decision | Options |
| --- | --- |
| Primary database | MongoDB, PostgreSQL or hybrid. |
| Identity provider | Auth0, Keycloak, Clerk, custom OIDC. |
| Warehouse | Snowflake, BigQuery, PostgreSQL replica, DuckDB/Parquet. |
| Local AI runtime | Ollama, llama.cpp, MLX, PyTorch, ONNX Runtime. |
| Queue | RabbitMQ, Kafka, Redis Queue, SQS-compatible. |
| Object storage | AWS S3, MinIO, Cloudflare R2, Wasabi. |
| First pilot scope | Wearables first, Vision first or Digital Twin first. |
| Hardware ownership | Customer-owned, HaaS or hybrid. |

## 38 Detailed Functional Requirements

This section defines the core functional requirements required to turn the concept into a buildable product backlog. Requirements are grouped by domain and should later be translated into epics, stories, acceptance criteria and test cases.

### 38.1 Athlete Management Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| ATH-001 | The system shall allow authorised staff to create athlete profiles. | Must |
| ATH-002 | The system shall support athlete assignment to club, team, age group and position. | Must |
| ATH-003 | The system shall store athlete development history over multiple seasons. | Must |
| ATH-004 | The system shall support injury history flags without exposing medical notes to unauthorised users. | Must |
| ATH-005 | The system shall support parent/guardian association for youth athletes. | Must |
| ATH-006 | The system shall support athlete status: active, injured, unavailable, trialist, archived. | Should |
| ATH-007 | The system shall support custom attributes per organisation. | Should |

### 38.2 Daily Check-In Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CHK-001 | Athletes shall be able to complete a daily check-in from mobile. | Must |
| CHK-002 | Check-ins shall support configurable questions per organisation. | Must |
| CHK-003 | The system shall prevent duplicate check-ins for the same athlete and day unless staff override is enabled. | Should |
| CHK-004 | The system shall show completion status to coaches. | Must |
| CHK-005 | The system shall flag concerning responses according to configured thresholds. | Must |
| CHK-006 | The system shall support offline capture and later synchronisation. | Should |

### 38.3 Training Plan Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| TRN-001 | Coaches shall be able to create session plans. | Must |
| TRN-002 | Coaches shall be able to assign sessions to athletes, groups or teams. | Must |
| TRN-003 | The system shall support session categories such as strength, tactical, endurance, speed, recovery and match. | Must |
| TRN-004 | The system shall support RPE collection after training. | Must |
| TRN-005 | The system shall compare planned load to completed load. | Should |
| TRN-006 | The system shall support microcycle planning. | Should |

### 38.4 Wearable Integration Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| WER-001 | The system shall support secure device connection and disconnection. | Must |
| WER-002 | The system shall store raw device payloads for audit and reprocessing. | Should |
| WER-003 | The system shall normalise wearable metrics into a common schema. | Must |
| WER-004 | The system shall indicate sync status and last sync time. | Must |
| WER-005 | The system shall handle missing data gracefully. | Must |
| WER-006 | The system shall support device-specific permissions and consent notices. | Must |

### 38.5 Media and Vision Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| VIS-001 | Athletes or staff shall be able to upload photos and videos. | Must |
| VIS-002 | The system shall store media in object storage and metadata in the database. | Must |
| VIS-003 | The system shall create AI processing jobs for new media. | Must |
| VIS-004 | The system shall extract frames from videos for analysis. | Must |
| VIS-005 | The system shall generate pose landmarks where model confidence is sufficient. | Must |
| VIS-006 | The system shall avoid generating conclusions where input quality is poor. | Must |
| VIS-007 | The system shall show confidence and limitations for each analysis. | Must |

### 38.6 AI Recommendation Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| REC-001 | Recommendations shall include the reason for the recommendation. | Must |
| REC-002 | Recommendations shall include confidence level. | Must |
| REC-003 | Coaches shall be able to accept, ignore or override recommendations. | Must |
| REC-004 | Overrides shall be logged for audit and model improvement. | Should |
| REC-005 | Recommendations shall not be presented as medical diagnosis. | Must |
| REC-006 | Recommendations involving minors shall support human review workflows. | Must |

### 38.7 Reporting Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| RPT-001 | The system shall generate athlete reports. | Must |
| RPT-002 | The system shall generate coach/team reports. | Must |
| RPT-003 | Reports shall be exportable to PDF. | Should |
| RPT-004 | Reports shall respect user permissions. | Must |
| RPT-005 | Reports shall include date range and source data notes. | Must |
| RPT-006 | Reports shall clearly mark AI-generated commentary. | Must |

## 39 Non-Functional Requirements

### 39.1 Performance Requirements

The system is designed primarily for batch throughput rather than real-time AI latency.

| Area | Requirement |
| --- | --- |
| Daily check-in submission | Should complete within normal web application response expectations. |
| Dashboard load | Should load recent metrics quickly for active teams. |
| Nightly processing | Should complete before the defined morning availability window. |
| Video processing | Can be asynchronous and delayed where queue volume is high. |
| Report generation | Can be synchronous for small reports and asynchronous for large reports. |

### 39.2 Availability Requirements

| Tier | Target |
| --- | --- |
| Starter | Business-hours support, best-effort processing. |
| Academy | Higher availability with monitored processing windows. |
| Professional | Defined uptime target and incident response. |
| Enterprise | Custom SLA, failover design and priority support. |

### 39.3 Scalability Requirements

The application layer shall support additional organisations without redesign.

The local AI cluster shall support additional nodes without changing application logic.

The processing queue shall support multiple job types and priorities.

Object storage shall support growth in photos and videos.

Warehouse design shall support multi-season analytics.

### 39.4 Maintainability Requirements

All AI engines shall be versioned.

All integration connectors shall be modular.

Business rules shall be configurable where possible.

Feature flags shall be used for pilot features.

Logs shall be structured and searchable.

### 39.5 Interoperability Requirements

Standard export formats shall include CSV, XLSX, PDF and JSON.

API contracts shall be documented using OpenAPI.

Device connectors shall convert vendor payloads into internal canonical metrics.

External integrations shall be decoupled from internal scoring logic.

## 40 Detailed Data Architecture

### 40.1 Data Classification

| Class | Examples | Controls |
| --- | --- | --- |
| Public | Marketing content, public product descriptions | Standard content controls. |
| Internal | Product configuration, non-sensitive operational data | Staff-only access. |
| Confidential | Coach notes, team plans, internal reports | Role-based access, audit logs. |
| Sensitive personal data | Athlete health/wellness signals, injury indicators, HRV, sleep | Strict access, consent/legal basis, encryption. |
| Youth data | Any data relating to minors | Parent/guardian controls, restricted access, child-friendly notices. |
| Media | Photos and videos | Secure storage, consent, retention, deletion controls. |
| Derived AI data | Scores, landmarks, recommendations | Model versioning, explainability, retention policy. |

### 40.2 Data Retention Matrix

The final retention policy must be defined with legal counsel and customers. The following is a working design matrix.

| Data type | Suggested retention approach |
| --- | --- |
| Daily check-ins | Retain during active athlete relationship; archive or delete under retention policy. |
| Wearable raw payloads | Retain only as long as required for audit/reprocessing; consider shorter retention than normalised metrics. |
| Normalised metrics | Retain for longitudinal development unless deletion requested or policy expires. |
| Photos | Retain only with explicit permission and clear deletion controls. |
| Videos | Retain for defined analysis windows; allow deletion after derived metrics are generated. |
| AI outputs | Retain with model version for explainability and audit. |
| Audit logs | Retain according to compliance policy; avoid storing unnecessary sensitive content in logs. |
| Consent records | Retain as long as needed to evidence lawful processing. |

### 40.3 Canonical Metric Schema

A normalised metric should use a consistent internal format.

{  "metricId": "met_123",  "athleteId": "ath_123",  "source": "oura",  "sourceMetric": "sleep_score",  "canonicalMetric": "sleep_quality_score",  "value": 84,  "unit": "score_0_100",  "startTime": "2026-06-07T00:00:00Z",  "endTime": "2026-06-07T08:00:00Z",  "confidence": "high",  "rawPayloadId": "raw_789",  "createdAt": "2026-06-07T08:15:00Z"}

### 40.4 AI Feature Store

An AI feature store or feature table should be introduced once the platform handles multiple models.

Feature examples:

Seven-day sleep average.

HRV deviation from personal baseline.

Acute load.

Chronic load.

ACWR.

Wellness trend.

Soreness trend.

Video movement symmetry index.

Sprint efficiency trend.

Coach rating trend.

## 41 Detailed AI Pipeline

### 41.1 Pipeline Stages

1. Raw Data Ingestion2. Validation3. Normalisation4. Feature Extraction5. Digital Twin Update6. Model Inference7. Rule-Based Guardrails8. Recommendation Generation9. Human Review Flagging10. Result Storage11. Dashboard Publication

### 41.2 Data Validation

Validation should check:

Required fields.

Valid units.

Valid timestamps.

Athlete identity and tenant boundary.

Duplicate events.

Outlier values.

Device sync consistency.

### 41.3 Feature Extraction

Feature extraction converts raw metrics into model-ready inputs.

Examples:

Convert sleep sessions into sleep duration, sleep efficiency and sleep trend.

Convert session RPE and duration into internal load.

Convert GPS payloads into high-speed distance and acceleration count.

Convert video landmarks into joint angle and symmetry features.

### 41.4 Guardrails

AI outputs should be filtered through business and safety guardrails.

Examples:

Do not recommend high-intensity work when injury status is active.

Do not present low-confidence video analysis as definitive.

Do not issue medical language.

Flag high-risk recommendations for human review.

Suppress outputs where consent does not allow processing.

### 41.5 Explainability

Each score should show:

Main contributing factors.

Direction of impact.

Data recency.

Missing data.

Confidence level.

Suggested human action.

Example:

| Factor | Impact | Explanation |
| --- | --- | --- |
| Sleep quality | Positive | Sleep score above personal 14-day average. |
| HRV | Positive | HRV within normal adaptive range. |
| Training load | Caution | Load elevated compared with recent baseline. |
| Soreness | Neutral | Athlete reported low soreness. |

## 42 Legal and Compliance Operating Model

### 42.1 Controller and Processor Model

The likely model is:

Club or organisation: data controller for athlete data.

Athlete IQ provider: data processor when operating on behalf of the club.

Athlete IQ provider may be controller for its own account, billing and operational data.

This must be confirmed per contract and jurisdiction.

### 42.2 Required Legal Documents

Master Service Agreement.

Data Processing Agreement.

Privacy Policy.

Cookie Policy where applicable.

Consent forms.

Parent/guardian consent forms.

Data retention policy.

Information security policy.

Sub-processor list.

Incident response policy.

### 42.3 DPIA Content

A Data Protection Impact Assessment should cover:

Categories of data processed.

Purposes of processing.

Legal basis.

Special category data assessment.

Youth data assessment.

Media processing assessment.

AI profiling assessment.

Risks to rights and freedoms.

Mitigation measures.

Residual risk.

Approval and review schedule.

### 42.4 Consent Management

Consent records should capture:

Who consented.

Whether guardian consent was required.

Consent version.

Scope of consent.

Date/time.

Withdrawal status.

Method of capture.

Related privacy notice version.

### 42.5 International Transfers

International deployments require careful handling of transfers outside the EEA/UK. The system should support data residency options and contractual transfer safeguards where required.

## 43 Medical and Safeguarding Governance

### 43.1 Safeguarding Principles

Youth athlete environments require heightened protection.

The product should:

Avoid unnecessary sensitive data collection.

Restrict access to sensitive information.

Provide parent/guardian controls where required.

Ensure staff permissions are role-appropriate.

Log access to sensitive records.

Use child-friendly explanations where athletes interact directly with data processing.

### 43.2 Health and Wellness Language Governance

A controlled glossary should be used across the product.

| Preferred | Avoid |
| --- | --- |
| Readiness indicator | Medical clearance |
| Risk indicator | Injury diagnosis |
| Human review recommended | Automated medical decision |
| Recovery signal | Clinical recovery assessment |
| Movement observation | Diagnostic finding |
| Wellness trend | Mental health diagnosis |

## 44 Product Analytics and Success Measurement

### 44.1 Adoption Metrics

| Metric | Purpose |
| --- | --- |
| Daily active athletes | Measures athlete adoption. |
| Weekly active coaches | Measures staff adoption. |
| Check-in completion rate | Measures data reliability. |
| Device connection rate | Measures wearable integration adoption. |
| Report views | Measures stakeholder value. |
| Recommendation actions | Measures decision support usage. |

### 44.2 Performance Metrics

| Metric | Purpose |
| --- | --- |
| Readiness trend adherence | Shows whether recommendations align with training decisions. |
| Recovery trend improvement | Tracks recovery behaviour changes. |
| Injury risk alerts reviewed | Tracks operational response. |
| Training compliance | Tracks plan execution. |
| Technical improvement | Tracks athlete vision value. |
| Benchmark movement | Tracks development over time. |

### 44.3 Business Metrics

| Metric | Purpose |
| --- | --- |
| Monthly recurring revenue | SaaS revenue base. |
| Churn | Subscription retention. |
| Expansion revenue | Growth within customers. |
| Customer acquisition cost | Sales efficiency. |
| Gross margin | Sustainability. |
| Support tickets per organisation | Operational burden. |

## 45 Testing and Quality Assurance

### 45.1 Test Types

| Test type | Purpose |
| --- | --- |
| Unit tests | Validate individual functions. |
| API tests | Validate endpoints and permissions. |
| Integration tests | Validate device connectors and data flow. |
| Security tests | Validate authentication, authorisation and tenant isolation. |
| AI regression tests | Validate model behaviour across versions. |
| Vision quality tests | Validate pose detection and input quality controls. |
| Load tests | Validate queue and processing capacity. |
| User acceptance tests | Validate workflows with coaches and athletes. |
| Compliance tests | Validate consent, export, deletion and audit flows. |

### 45.2 Release Gate Criteria

A release should not go live unless:

Critical security tests pass.

Tenant isolation tests pass.

Consent flows work.

Data export and deletion workflows are tested.

AI outputs show confidence and explanation.

No medical diagnostic claims appear in product text.

Processing failures are visible and recoverable.

Backup and restore processes are documented.

## 46 Implementation Team Structure

### 46.1 Recommended Team

| Role | Responsibility |
| --- | --- |
| Product Director | Product scope, roadmap, customer alignment. |
| Solution Architect | Architecture, integration patterns, scalability. |
| Full-stack Engineer | Web app, dashboards, API. |
| Backend Engineer | Data model, integrations, services. |
| AI/ML Engineer | AI engines, scoring, model evaluation. |
| Computer Vision Engineer | Photo/video analysis pipeline. |
| DevOps Engineer | Cloud, local cluster, monitoring, deployment. |
| UX/UI Designer | Dashboards, mobile app, visual design system. |
| QA Engineer | Test plans and release validation. |
| Privacy/Legal Adviser | GDPR, consent, DPA, DPIA support. |
| Sports Science Adviser | Metric validity, coaching language, performance methodology. |

### 46.2 RACI Snapshot

| Workstream | Product | Engineering | AI | Legal/DPO | Sports Science | Customer |
| --- | --- | --- | --- | --- | --- | --- |
| Roadmap | A | C | C | C | C | C |
| Data model | C | A | C | C | C | I |
| AI scoring | C | C | A | C | A/C | I |
| GDPR | C | C | I | A | C | A/C |
| Device integrations | C | A | C | I | C | C |
| Dashboards | A | R | C | C | C | C |
| Go-live | A | R | R | A/C | C | A |

A = Accountable, R = Responsible, C = Consulted, I = Informed.

## 47 Customer Onboarding Plan

### 47.1 Step 1 - Discovery

Confirm organisation structure.

Confirm teams and athlete counts.

Confirm devices and integrations.

Confirm data protection roles.

Confirm pilot objectives.

### 47.2 Step 2 - Configuration

Create organisation.

Configure roles.

Configure teams.

Configure check-ins.

Configure scoring thresholds.

Configure consent flows.

### 47.3 Step 3 - Data Import

Import athletes.

Import staff.

Import historical data where available.

Connect devices.

### 47.4 Step 4 - Training

Coach training.

Athlete onboarding.

Parent/guardian communication where required.

Admin training.

### 47.5 Step 5 - Pilot Operation

Run pilot for 4-8 weeks.

Monitor adoption.

Review data quality.

Adjust workflows.

### 47.6 Step 6 - Scale-Up

Add teams.

Add devices.

Expand dashboards.

Enable advanced AI modules.

## 48 Procurement and Hardware Plan

### 48.1 Pilot Hardware

| Item | Recommended minimum |
| --- | --- |
| Processing node | Mac mini M4 Pro |
| Unified memory | 48 GB minimum |
| SSD | 1 TB minimum, 2 TB preferred for local cache |
| Network | 10Gb Ethernet preferred |
| Backup | External encrypted backup or network backup |
| UPS | Recommended for local processing environment |

### 48.2 Academy Hardware

| Item | Recommended |
| --- | --- |
| Processing nodes | 2-4 Mac mini M4 Pro nodes |
| Storage | S3-compatible object storage plus local cache |
| Network | 10Gb switch if multiple nodes |
| Monitoring | Node monitoring dashboard |
| Physical security | Locked office/server cabinet |

### 48.3 Enterprise Hardware

| Item | Recommended |
| --- | --- |
| Processing nodes | 8-20+ nodes depending on video volume |
| Optional high-power node | Mac Studio or GPU server for heavy workloads |
| Orchestration | Queue-based node management |
| Redundancy | Spare nodes and failover plan |
| Security | Restricted physical access and asset inventory |

## 49 Financial Model and Pricing Logic

### 49.1 Why SaaS

A subscription model lowers the customer’s initial barrier while creating recurring revenue. It also aligns with ongoing value: data processing, AI improvements, device integrations, reports, support and continuous development.

### 49.2 Indicative Revenue Scenarios

| Scenario | Customers | Average monthly fee | Monthly revenue | Annual revenue |
| --- | --- | --- | --- | --- |
| Early pilot | 5 | 999 EUR | 4,995 EUR | 59,940 EUR |
| Initial market | 10 | 1,999 EUR | 19,990 EUR | 239,880 EUR |
| Growth | 25 | 1,999 EUR | 49,975 EUR | 599,700 EUR |
| International | 50 | 3,999 EUR | 199,950 EUR | 2,399,400 EUR |

These are illustrative scenarios, not forecasts.

### 49.3 Recommended Early-Adopter Offer

50% discount on defined development scope.

Minimum 24-month subscription.

Customer agrees to structured feedback cycles.

Customer agrees to reference rights subject to confidentiality.

Scope changes billed separately.

## 50 Future Roadmap

### 50.1 Future Product Extensions

Advanced tactical video analysis.

Match event tagging.

Player recruitment profiles.

Federation-level talent pathway analytics.

Parent engagement tools.

Automated seasonal reports.

Research mode for universities.

Multi-language support.

Marketplace for certified performance partners.

Team chemistry and tactical decision-support analytics.

### 50.2 Advanced AI Extensions

Personalised training microcycle generation.

Multi-modal reasoning across video, wearable and coach notes.

Explainable cohort comparisons.

Long-term potential modelling.

AI-assisted scouting reports.

Natural language query interface for coaches.

## 51 Conclusion

Athlete IQ 2.0 is best understood as a privacy-first athlete operating system. The strategic asset is the Athlete Digital Twin. The strategic differentiator is local AI. The commercial model is SaaS with modular expansion. The technical approach is cloud application plus local AI cluster. The compliance posture is privacy by design, youth protection and human oversight.

The recommended execution approach is phased delivery: build the operating foundation, add wearables, establish the Digital Twin, deploy local AI, add vision, integrate performance hardware, then expand into injury prevention, dashboards, communication, integrations and international scale.

The result is a platform capable of supporting individual athletes, clubs, academies and federations with a single unified system for athlete intelligence, development and decision support.

## 52 Appendix A - Slide Deck Alignment

| Slide | Documentation section |
| --- | --- |
| 1 Executive Overview | Executive Summary, Strategic Positioning |
| 2 Data Collection Layer | Data Collection Layer |
| 3 Cloud Data Platform | Cloud Data Platform |
| 4 Athlete Digital Twin | Athlete Digital Twin |
| 5 Local AI Cluster | Local AI Processing Cluster |
| 6 AI Intelligence Layer | AI Intelligence Layer |
| 7 Athlete Vision | Athlete Vision Platform |
| 8 Performance Lab | Performance Lab |
| 9 Performance Dashboards | Performance Dashboards |
| 10 Injury Prevention Hub | Injury Prevention Hub |
| 11 Communication & Collaboration | Communication and Collaboration |
| 12 Integrations & Ecosystem | Integrations and Ecosystem |
| 13 Insights & Decision Support | Insights and Decision Support |
| 14 Mobile App & Athlete Portal | Mobile App and Athlete Portal |
| 15 Privacy First Architecture | Privacy First Architecture |
| 16 GDPR & Youth Protection | GDPR and Youth Protection |
| 17 Why Local AI? | Why Local AI, Local AI Processing Cluster |
| 18 Executive Summary & Next Steps | Business Value, Roadmap, Commercial Model |

## 53 Appendix B - Reference Technology Stack

| Layer | Primary recommendation | Notes |
| --- | --- | --- |
| Frontend | Next.js / React / PWA | Mobile web app and dashboards. |
| Backend | Node.js / NestJS | API and business logic. |
| AI services | Python / FastAPI | Model inference and processing endpoints. |
| Database | MongoDB or PostgreSQL | Final choice depends on team preference and schema needs. |
| Object storage | S3-compatible | Photos, videos and reports. |
| Warehouse | Snowflake / BigQuery / PostgreSQL analytics | Long-term reporting. |
| Queue | RabbitMQ / Kafka / Redis Queue | Batch processing. |
| Vision | OpenCV, MediaPipe, YOLO/pose models | Photo and video analysis. |
| Local LLM | Ollama / llama.cpp / MLX | Local report generation and recommendations. |
| Hardware | Mac mini M4 Pro nodes | Horizontal scaling. |
| Monitoring | Grafana / Prometheus / OpenTelemetry | System observability. |

## 54 Appendix C - Reference Sources

The following external sources should be treated as references for the legal, compliance and technical assumptions in this document. They do not replace legal, regulatory or security review.

Regulation (EU) 2016/679, General Data Protection Regulation, official text via EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679

European Data Protection Board, Guidelines 05/2020 on consent under Regulation 2016/679: https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf

European Commission, AI Act regulatory framework overview: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

Regulation (EU) 2024/1689, Artificial Intelligence Act, official text via EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202401689

European Commission / MDCG, Guidance on qualification and classification of software under MDR/IVDR: https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en

Apple Mac mini technical specifications: https://www.apple.com/mac-mini/specs/

Apple Mac Studio technical specifications: https://www.apple.com/mac-studio/specs/

Google AI Edge, MediaPipe Pose Landmarker documentation: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker

MongoDB documentation, role-based access control: https://www.mongodb.com/docs/manual/core/authorization/

## 55 Appendix D - Legal and Medical Disclaimer

This document describes an intended product architecture and commercial plan. It does not constitute legal advice, medical advice, clinical guidance, financial advice or regulatory certification.

Before launch, Athlete IQ should complete:

Legal review.

Data Protection Impact Assessment.

Data Processing Agreement templates.

Privacy notice and consent flows.

Security review.

Medical/regulatory boundary assessment.

Child safeguarding review.

Customer-specific deployment review.

Athlete IQ should be marketed as a coaching, performance and wellness decision-support system unless and until a formal medical device regulatory strategy is completed.
