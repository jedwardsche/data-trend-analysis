# KPI 2 — Real-Time Analytics & Trend Reporting

## Context Prime: PRD + Technical Spec + Roadmap

**Version:** 1.0
**Last Updated:** February 16, 2026
**Deadline:** March 1, 2026
**Bonus Value:** $800 (stretch goal, +1%, total $3,200)

---

## Table of Contents

1. [Product Requirements Document](#1-product-requirements-document)
2. [Technical Specification](#2-technical-specification)
3. [Roadmap & Phases](#3-roadmap--phases)
4. [Reference Data](#4-reference-data)
5. [AI Agent Context Rules](#5-ai-agent-context-rules)

---

## 1. Product Requirements Document

### 1.1 Overview

Build a React-based analytics dashboard for CHE executive leadership that surfaces real-time and historical metrics on student enrollment, retention, attrition, attendance, and growth across returning campuses. The system ingests data from multiple Airtable bases (one per school year), syncs to Firestore nightly, and presents Metabase-style visualizations with PDF/CSV export capabilities.

### 1.2 Users

- **Primary audience:** CHE executive leadership (~10 users)
- **Access method:** Google SSO (Google Admin Console integration)
- **Use case:** Trend analysis, organizational planning, year-over-year comparison, enrollment projections

### 1.3 Deliverables

#### D1: Analytics Dashboards

Real-time metrics (current as of last sync) on:

- **Total enrollment** — current year headcount, broken down by returning students vs. new students at returning campuses
- **Retention rate** — returning eligible students ÷ total eligible (excluding graduates)
- **Attrition (total)** — sum of non-starters + mid-year withdrawals
  - **Non-starters** — enrolled but zero attendance through count day (Oct 1) or departure, whichever comes first
  - **Mid-year withdrawals** — attended at least once, then left (excluding verified transfers to accredited schools/programs)
  - **Verified transfers** — tracked separately, excluded from attrition totals
- **Growth metrics:**
  - Total new students
  - Internal growth (new students at returning campuses) — count and % of total growth
  - New campus growth — count and % of total growth
  - Net growth (new students minus withdrawals)
- **Attendance** — daily, aggregated at campus level
- **Enrollment timing** — weekly chart showing when students enroll throughout the year
- **ERBOCES projected revenue** — per-student cost × eligible student count (per-student cost provided manually by admin)

#### D2: Year-Over-Year Comparison Views

- Campus-level enrollment and retention trends across available school years (floor: 2023-24)
- Historical snapshots locked at Oct 1 count day for each year
- Side-by-side comparison of current year (live) vs. prior years (frozen)

#### D3: PDF & CSV Exports

- PDF reports matching the narrative template format (see Section 4.1)
- CSV data exports for any dashboard view

### 1.4 Metric Definitions

| Metric | Definition | Calculation |
|--------|-----------|-------------|
| Total Enrollment | All students with active enrollment status in current year | Count of records where Status of Enrollment ∈ {Enrolled, Enrolled After Count Day (no funding), Waitlist} |
| Retention Rate | % of eligible students who returned | Returning students ÷ (Prior year total − graduates) |
| Non-Starters | Enrolled but never attended past count day | Enrolled + zero presence records through Oct 1 or departure |
| Mid-Year Withdrawal | Attended then left, excluding verified transfers | Students with ≥1 attendance record who later withdrew, minus verified transfers |
| Attrition (Total) | All student separations | Non-starters + mid-year withdrawals |
| Verified Transfers | Left but transferred to accredited program | Tracked separately — excluded from attrition |
| Internal Growth | New students at returning campuses | New enrollees at campuses that existed in prior year |
| New Campus Growth | Students at brand-new campuses | Enrollees at campuses with no prior-year records |
| Net Growth | New students minus withdrawals | Total new students − mid-year withdrawals |
| ERBOCES Revenue | Projected funding | Admin-provided per-student cost × eligible count |
| Attendance | Daily presence rate by campus | Present days ÷ total school days, campus-level |

### 1.5 Measurement Criteria

- Dashboards fully operational by March 1, 2026
- Demonstrated ability to generate historical (locked at Oct 1) and real-time insights for leadership
- PDF exports match narrative template format
- Data refreshes nightly + manual trigger available

### 1.6 Out of Scope (Phase 1)

- AI agent chat (Phase 2)
- Individual student-level drill-down
- New campus data (only returning campuses in scope)
- Parent or public-facing views
- Staff turnover metrics

---

## 2. Technical Specification

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase Hosting                         │
│  React + Vite + shadcn/ui + CHE MCP Components + Tremor/Recharts│
│                    Google SSO (Firebase Auth)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ httpsCallable()
┌──────────────────────────▼──────────────────────────────────────┐
│                     Cloud Functions                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ Sync Engine  │  │ Query API    │  │ Export Service       │    │
│  │ (scheduled + │  │ (dashboard   │  │ (PDF gen + CSV)      │    │
│  │  manual)     │  │  data)       │  │                      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘    │
│         │                 │                      │               │
│  ┌──────▼─────────────────▼──────────────────────▼──────────┐   │
│  │                    Firestore                              │   │
│  │  Unified collection: schoolYear + campus + metricType     │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ▲                                                        │
│  ┌──────┴──────────┐                                             │
│  │ Airtable API    │  (Personal Access Token in Secret Manager)  │
│  │ via pyairtable   │                                            │
│  │ or REST in Node  │                                            │
│  └─────────────────┘                                             │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| UI Components | shadcn/ui + CHE MCP components (`@che-systems/cli mcp init`) |
| Charts | Tremor or Recharts (decision point — see 2.10) |
| Auth | Firebase Auth with Google SSO |
| Backend | Firebase Cloud Functions (Node.js) |
| Database | Firestore (unified collection) |
| Data Source | Airtable REST API (Personal Access Tokens) |
| Secrets | Google Cloud Secret Manager (`defineSecret()`) |
| Hosting | Firebase Hosting |
| PDF Generation | Cloud Function using a headless renderer or template engine |
| Exports | CSV via Cloud Function, PDF via template-based generation |

### 2.3 Data Source: Airtable

#### Base Structure

- One base per school year (non-standardized naming)
- ~99% consistent schema across year bases
- A **config file** maps field names per base to canonical field names

#### Config File Schema (`airtable-config.json`)

```json
{
  "bases": [
    {
      "baseId": "appXXXXXXXXXXXXXX",
      "schoolYear": "2023-24",
      "label": "Students 2023-24",
      "tables": {
        "students": {
          "tableIdOrName": "Students",
          "fields": {
            "firstName": "First Name",
            "lastName": "Last Name",
            "dob": "Date of Birth",
            "enrollmentStatus": "Status of Enrollment",
            "campusName": "Campus Name",
            "mcLeader": "MC Leader",
            "created": "Created",
            "lastModified": "Last Modified"
          }
        },
        "attendance": {
          "tableIdOrName": "Attendance 2023-24",
          "fields": {
            "studentLink": "Student",
            "date": "Date",
            "status": "Status"
          }
        },
        "absences": {
          "tableIdOrName": "Absent",
          "fields": {
            "studentLink": "Student",
            "date": "Date"
          }
        }
      }
    }
  ]
}
```

**Notes:**

- Field names are looked up from this config at sync time — no hardcoded field names in sync logic
- Adding a new school year = adding a new entry to this config
- The config is stored in Firestore (`config/airtable`) so it can be updated without redeployment

#### Student Unique Identifier

Composite key: `firstName + lastName + dob` (normalized: lowercased, trimmed, date formatted as `YYYY-MM-DD`). This is used for cross-year matching (retention tracking).

```typescript
function studentKey(first: string, last: string, dob: string): string {
  return `${first.toLowerCase().trim()}|${last.toLowerCase().trim()}|${formatDate(dob, 'YYYY-MM-DD')}`;
}
```

#### Returning Campus Identifier

A campus is "returning" if the same `campusName + mcLeader` combination exists in both the current and prior school year base. Composite key: `campusName|mcLeaderName` (normalized).

#### Enrollment Status Values

Active enrollment: `"Enrolled"`, `"Enrolled After Count Day (no funding)"`, `"Waitlist"`

These values determine which students are counted in enrollment totals.

#### Attendance Determination

- **2025-26 and forward:** Check the Absent table. A student with an absence record for every school day through departure or count day = non-starter. No absence records on a school day = present.
- **2024-25 and earlier:** Check the Attendance table for recorded presences. Zero presence records = non-starter.

This logic difference must be handled in the sync engine per school year.

### 2.4 Firestore Schema

#### Unified Collection: `students`

```typescript
interface StudentRecord {
  id: string;                    // Firestore doc ID
  studentKey: string;            // composite: first|last|dob
  firstName: string;
  lastName: string;
  dob: string;                   // YYYY-MM-DD
  schoolYear: string;            // "2024-25"
  campus: string;                // campus name
  mcLeader: string;              // micro-campus leader name
  campusKey: string;             // campus|mcLeader normalized
  enrollmentStatus: string;      // raw value from Airtable
  enrolledDate: string;          // from Created field or enrollment status last modified
  isReturningStudent: boolean;   // matched in prior year
  isReturningCampus: boolean;    // campusKey exists in prior year
  attendedAtLeastOnce: boolean;  // derived from attendance data
  withdrawalDate: string | null; // if withdrawn
  isVerifiedTransfer: boolean;   // excluded from attrition
  isGraduate: boolean;           // senior who graduated
  syncedAt: string;              // ISO timestamp of last sync
}
```

#### Snapshots Collection: `snapshots`

```typescript
interface Snapshot {
  id: string;                    // schoolYear-YYYY-MM-DD
  schoolYear: string;
  snapshotDate: string;          // "2025-10-01"
  isCountDay: boolean;
  metrics: {
    totalEnrollment: number;
    returningStudents: number;
    newStudentsReturningCampuses: number;
    retentionRate: number;
    nonStarters: number;
    midYearWithdrawals: number;
    verifiedTransfers: number;
    attritionTotal: number;
    internalGrowth: number;
    newCampusGrowth: number;
    totalNewGrowth: number;
    netGrowth: number;
  };
  byCampus: {
    [campusKey: string]: {
      campusName: string;
      mcLeader: string;
      totalEnrollment: number;
      returningStudents: number;
      newStudents: number;
      retentionRate: number;
      nonStarters: number;
      midYearWithdrawals: number;
      attendanceRate: number;
    };
  };
  createdAt: string;
  lockedAt: string | null;       // non-null for Oct 1 snapshots
}
```

#### Config Collection: `config/airtable`

Stores the `airtable-config.json` contents so field mappings can be updated without redeployment.

#### Config Collection: `config/settings`

```typescript
interface AppSettings {
  erbocesPerStudentCost: number;    // manually set by admin
  countDayDate: string;              // "10-01" (month-day)
  currentSchoolYear: string;         // "2025-26"
  activeSchoolYears: string[];       // ["2023-24", "2024-25", "2025-26"]
}
```

#### Enrollment Timeline Collection: `enrollmentTimeline`

```typescript
interface EnrollmentWeek {
  id: string;                     // schoolYear-YYYY-WXX
  schoolYear: string;
  weekStart: string;              // ISO date of week start
  weekNumber: number;
  newEnrollments: number;
  cumulativeEnrollment: number;
  byCampus: {
    [campusKey: string]: {
      newEnrollments: number;
      cumulativeEnrollment: number;
    };
  };
}
```

### 2.5 Cloud Functions

#### `syncAirtableData` (Scheduled + Manual)

- **Trigger:** Cloud Scheduler (nightly at 2:00 AM MT) + callable from dashboard admin button
- **Process:**
  1. Read config from `config/airtable`
  2. For each configured base/school year:
     - Fetch all student records using mapped field names
     - Fetch attendance/absence records
     - Normalize to `StudentRecord` schema
     - Compute `isReturningStudent` by matching `studentKey` against prior year
     - Compute `isReturningCampus` by matching `campusKey` against prior year
     - Compute `attendedAtLeastOnce` using year-appropriate attendance logic
     - Upsert to Firestore `students` collection
  3. Recalculate enrollment timeline (`enrollmentTimeline` collection)
  4. Generate a current snapshot (non-locked)
  5. If today is Oct 1 and no locked snapshot exists for this year, create and lock it
- **Secrets:** Airtable Personal Access Token in Secret Manager via `defineSecret()`
- **Error handling:** Log failures per base, continue syncing other bases, report summary

#### `getSnapshotData` (Callable)

- **Input:** `{ schoolYear, campusKey? }`
- **Returns:** Current snapshot or Oct 1 locked snapshot for the requested year
- **Auth:** Requires `request.auth`, validates against allowed user list

#### `getDashboardData` (Callable)

- **Input:** `{ schoolYear, view: 'overview' | 'campus' | 'yoy' | 'timeline' }`
- **Returns:** Aggregated metrics for the requested view
- **Auth:** Requires `request.auth`

#### `triggerManualSync` (Callable, Admin-only)

- **Input:** `{ schoolYear?: string }` (optional — sync all if omitted)
- **Auth:** Admin check via custom claim or allowlist
- **Returns:** Sync status and summary

#### `exportPDF` (Callable)

- **Input:** `{ schoolYear, reportType: 'annual' | 'campus', campusKey? }`
- **Process:** Generates narrative-format PDF matching template (see Section 4.1)
- **Returns:** Signed download URL from Firebase Storage (expires in 1 hour)

#### `exportCSV` (Callable)

- **Input:** `{ schoolYear, dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline' }`
- **Returns:** CSV as a downloadable response

### 2.6 Frontend Architecture

#### Route Structure

```
/                          → Redirect to /dashboard
/login                     → Google SSO login
/dashboard                 → Overview (org-wide metrics, current year)
/dashboard/campus/:id      → Campus detail view
/dashboard/yoy             → Year-over-year comparison
/dashboard/timeline        → Enrollment timing chart
/dashboard/admin           → Manual sync trigger, config, ERBOCES cost input
```

#### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx        # Main layout with sidebar nav
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── charts/
│   │   ├── EnrollmentOverview.tsx     # Total enrollment bar/line chart
│   │   ├── RetentionGauge.tsx         # Retention rate display
│   │   ├── GrowthBreakdown.tsx        # Internal vs new campus pie/bar
│   │   ├── AttritionBreakdown.tsx     # Non-starters vs withdrawals
│   │   ├── AttendanceChart.tsx        # Daily attendance by campus
│   │   ├── EnrollmentTimeline.tsx     # Weekly enrollment timing
│   │   ├── YearOverYearChart.tsx      # Multi-year comparison
│   │   └── ERBOCESRevenue.tsx         # Projected funding display
│   ├── cards/
│   │   ├── MetricCard.tsx             # Reusable KPI card (value + delta)
│   │   └── CampusCard.tsx             # Campus summary card
│   ├── tables/
│   │   └── CampusTable.tsx            # Sortable campus metrics table
│   ├── export/
│   │   ├── ExportPDFButton.tsx
│   │   └── ExportCSVButton.tsx
│   └── admin/
│       ├── SyncButton.tsx
│       ├── SyncStatus.tsx
│       └── ERBOCESInput.tsx
├── hooks/
│   ├── useDashboardData.ts
│   ├── useSnapshot.ts
│   ├── useEnrollmentTimeline.ts
│   └── useAuth.ts
├── lib/
│   ├── firebase.ts                   # Firebase init (NO secrets)
│   ├── functions.ts                  # httpsCallable wrappers
│   └── formatters.ts                 # Number/date/percent formatters
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── CampusDetail.tsx
│   ├── YearOverYear.tsx
│   ├── Timeline.tsx
│   └── Admin.tsx
└── types/
    └── index.ts                      # Shared TypeScript interfaces
```

### 2.7 Auth & Security

- **Firebase Auth** with Google SSO provider
- **Allowlist:** ~10 executive email addresses stored in `config/allowedUsers` in Firestore
- **Cloud Functions** validate `request.auth.token.email` against allowlist on every call
- **No secrets in frontend** — all Airtable API calls go through Cloud Functions
- **Airtable Personal Access Token** stored in Google Cloud Secret Manager, accessed via `defineSecret()`
- **Firebase Hosting** serves only the React SPA — no server-side rendering needed
- **Firestore Security Rules:** deny all direct client reads/writes; all access via Cloud Functions

### 2.8 Oct 1 Count Day Snapshot Logic

```
On each sync run:
  1. Check if today >= Oct 1 for the current school year
  2. Check if a locked snapshot exists for this school year
  3. If today >= Oct 1 AND no locked snapshot exists:
     a. Calculate all metrics as of current data
     b. Create snapshot document with lockedAt = NOW()
     c. This snapshot is immutable — never overwritten
  4. All subsequent syncs create non-locked "current" snapshots
  5. Dashboard shows:
     - Prior years: Oct 1 locked snapshot only
     - Current year: live snapshot (with Oct 1 locked as reference if available)
```

### 2.9 PDF Report Template

The PDF export matches the narrative format provided by leadership. Example structure:

```
CHE Student Data Report: [School Year A] to [School Year B]

Our student enrollment [grew/declined] from [X] to [Y] — a [Z]% [increase/decrease].

[returning] out of [eligible] (eligible students) returned for [School Year B]
– Retention rate: [X]%

[X] students withdrew during the school year.
[X] students were seniors who graduated (not eligible to return).

[Total] total students:
  [X] returning students
  [X] new students in returning campuses

New growth at returning campuses: [X] = [Y]% of growth
Total new growth overall: [X] students

ERBOCES Projected Revenue: $[amount] for [school year]

--- Campus Breakdown ---
[Per-campus metrics table]
```

### 2.10 Decision Points

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Charting library | Tremor vs Recharts | **Tremor** — built on shadcn, dashboard-native, less config. Falls back to Recharts if Tremor lacks a needed chart type. |
| Airtable sync language | Node.js (Cloud Functions native) vs Python (pyairtable) | **Node.js** — same runtime as Cloud Functions, no additional container needed. Use Airtable REST API directly. |
| PDF generation | Puppeteer (headless Chrome) vs template engine (PDFKit, jsPDF) | **PDFKit in Cloud Function** — lighter weight, no headless browser needed, sufficient for narrative-format reports. |

---

## 3. Roadmap & Phases

### Phase 1: Foundation (Target: 5 days)

**Goal:** Data pipeline operational, basic dashboard rendering.

| Task | Description | Est. |
|------|-------------|------|
| 1.1 | Firebase project setup (Hosting, Functions, Firestore, Auth, Secret Manager) | 0.5d |
| 1.2 | Create `airtable-config.json` for all year bases (2023-24, 2024-25, 2025-26) | 0.5d |
| 1.3 | Build sync engine Cloud Function — read config, fetch from Airtable, normalize, write to Firestore | 2d |
| 1.4 | Implement student matching logic (cross-year retention via composite key) | 0.5d |
| 1.5 | Implement returning campus detection | 0.5d |
| 1.6 | Implement attendance logic (dual-mode: Absent table for 25-26, Attendance table for prior years) | 0.5d |
| 1.7 | Schedule nightly sync via Cloud Scheduler | 0.5d |

**Milestone:** Run sync, verify Firestore contains correct normalized data for all years.

### Phase 2: Dashboard UI (Target: 4 days)

**Goal:** All dashboard views rendering with live data.

| Task | Description | Est. |
|------|-------------|------|
| 2.1 | Scaffold React app with Vite + shadcn + CHE MCP components | 0.5d |
| 2.2 | Implement Google SSO auth flow + allowlist check | 0.5d |
| 2.3 | Build DashboardShell layout (sidebar, header, routing) | 0.5d |
| 2.4 | Build Overview page — MetricCards for all top-level KPIs | 0.5d |
| 2.5 | Build charts: enrollment overview, retention gauge, growth breakdown, attrition breakdown | 1d |
| 2.6 | Build campus detail view with per-campus metrics | 0.5d |
| 2.7 | Build enrollment timeline chart (weekly) | 0.5d |

**Milestone:** Dashboard renders all metrics. Leadership can view current data.

### Phase 3: Historical & Comparison (Target: 2 days)

**Goal:** Year-over-year views and Oct 1 snapshot logic.

| Task | Description | Est. |
|------|-------------|------|
| 3.1 | Implement Oct 1 snapshot lock logic in sync engine | 0.5d |
| 3.2 | Build Year-Over-Year comparison page | 0.5d |
| 3.3 | Build snapshot selector (live vs Oct 1 locked) | 0.5d |
| 3.4 | ERBOCES revenue display with admin-configurable per-student cost | 0.5d |

**Milestone:** Historical and live views both functional. Oct 1 snapshots lock correctly.

### Phase 4: Exports & Admin (Target: 2 days)

**Goal:** PDF/CSV exports, admin controls.

| Task | Description | Est. |
|------|-------------|------|
| 4.1 | Build PDF export Cloud Function (narrative template format) | 1d |
| 4.2 | Build CSV export Cloud Function | 0.5d |
| 4.3 | Build Admin page — manual sync trigger, ERBOCES cost input, sync status | 0.5d |

**Milestone:** Full feature parity with deliverables. Exports match template.

### Phase 5: Polish & Deploy (Target: 1 day)

| Task | Description | Est. |
|------|-------------|------|
| 5.1 | UI polish — responsive layout, loading states, error handling | 0.5d |
| 5.2 | Deploy to Firebase Hosting, configure custom domain if needed | 0.25d |
| 5.3 | End-to-end walkthrough with leadership data | 0.25d |

**Milestone:** Production deployment. Dashboards fully operational.

**Total Phase 1 estimate: ~14 working days (Feb 16 → Mar 1 = 13 calendar days, tight but feasible)**

---

### Phase 2: AI Agent Chat (Post March 1)

**Goal:** Natural language query interface over pre-populated Firestore data.

| Task | Description | Est. |
|------|-------------|------|
| 6.1 | Build chat Cloud Function — receives user question, queries Firestore, sends context + question to Claude API | 1d |
| 6.2 | Build React chat component (slide-out panel in dashboard) | 1d |
| 6.3 | Define system prompt with metric definitions, schema context, and allowed query patterns | 0.5d |
| 6.4 | Chat history in Firestore (per-user subcollection, optional) | 0.5d |

**Architecture:**

```
User types question in chat panel
  → httpsCallable('chatQuery')
    → Cloud Function:
      1. Validate auth
      2. Parse intent from question
      3. Query Firestore for relevant data
      4. Build context: metric definitions + queried data + user question
      5. Call Claude API (key in Secret Manager)
      6. Return analysis to frontend
  → Display response in chat panel
```

**Scalability note:** Because the Firestore schema uses consistent shapes (`schoolYear`, `campus`, `metricType`), the agent can query any metric — including ones added after initial deployment — without code changes to the chat function. New metrics only require:

1. Add to sync engine
2. Add definition to the agent's system prompt

**Estimated effort:** 3 days post-Phase 1 delivery.

---

## 4. Reference Data

### 4.1 Template Report (Source Format)

```
Student data: 2024-25 to 2025-26
Our student enrollment has nearly doubled, growing from 1,427 to 2,825 — a 98% increase.
988 out of 1379 (eligible students) returned for 2025-26 – Retention rate: 72%
83 students withdrew during the school year
48 students were seniors who graduated (not eligible to return)
2825 total students: 705 from new campus; 988 returning students; 1132 new students in returning campuses
New growth at returning campuses: 1,132 = 62% of growth
New growth at new campuses: 705 = 38% of growth
Total new growth overall: 1,132 + 705 = 1,837 students

Student data: 2023-24 to 2024-25
Enrollment: 744 students - 1427 students
Total Growth: 683 students (~91.7% increase)
Breakdown of Growth:
  Internal Growth: 234 students (~31.5% increase, ~34.3% of total growth)
  New Campus Growth: 449 students (~60.3% increase, ~65.7% of total growth)

$11,380.00 projected from ERBOCES - for 25/26 year
```

### 4.2 Historical Data Points

| School Year | Total Enrollment | Growth | Growth % | Retention Rate |
|-------------|-----------------|--------|----------|----------------|
| 2023-24 | 744 | — | — | — |
| 2024-25 | 1,427 | 683 | 91.7% | TBD |
| 2025-26 | 2,825 | 1,398 | 98% | 72% (988/1,379) |

### 4.3 Enrollment Status Values

| Value | Meaning | Counted in Enrollment? |
|-------|---------|----------------------|
| Enrolled | Active student | Yes |
| Enrolled After Count Day (no funding) | Active, enrolled after Oct 1 | Yes |
| Waitlist | Pending placement | Yes |
| (other values) | TBD — to be mapped | No (unless specified) |

### 4.4 Attrition Taxonomy

```
Attrition (Total)
├── Non-Starters
│   └── Enrolled but zero attendance through count day or departure
├── Mid-Year Withdrawals
│   └── Attended ≥1 day, then left (excluding verified transfers)
└── [Excluded] Verified Transfers
    └── Left but transferred to accredited school/program — tracked separately
```

---

## 5. AI Agent Context Rules

These rules govern how any AI assistant should operate when developing this project:

### 5.1 Scope Guard

- **Only build what is in the Deliverables (D1, D2, D3) for Phase 1.**
- If a feature is not listed in Section 1.3, it is out of scope unless the developer explicitly adds it.
- The AI agent chat is Phase 2 — do not build it during Phase 1, but design the data layer to support it.

### 5.2 Data Rules

- Never hardcode Airtable field names. Always read from `config/airtable` in Firestore.
- Student identity = `firstName|lastName|dob` composite key. There is no single unique ID field.
- Returning campus = same `campusName|mcLeader` in both current and prior year.
- Only returning campuses appear in the dashboard. New campuses are excluded from campus-level views.
- Attendance logic differs by year: Absent table (25-26+) vs Attendance presence table (24-25 and earlier).

### 5.3 Security Rules

- No secrets in frontend code. No `VITE_` environment variables for API keys.
- All external API calls (Airtable, Claude) go through Cloud Functions.
- Secrets in Google Cloud Secret Manager via `defineSecret()`.
- Frontend calls Cloud Functions via `httpsCallable()` only.
- Validate `request.auth` on every Cloud Function call.
- Never log or persist secrets in plaintext.

### 5.4 Schema Design Principle

Design all Firestore collections with the AI agent chat in mind. Every document should include:

- `schoolYear` — enables year filtering
- `campus` / `campusKey` — enables campus filtering
- Consistent field naming — the agent's system prompt maps field names to natural language

This ensures Phase 2 (AI chat) can query any data without structural changes.

### 5.5 Config-Driven Architecture

When adding support for a new school year:

1. Add a new entry to `config/airtable` in Firestore with the base ID and field mappings
2. Add the school year to `config/settings.activeSchoolYears`
3. Run a manual sync

No code changes required.
