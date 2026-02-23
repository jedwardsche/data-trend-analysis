# Cumulative Enrollment Graph — Logic Overview

## Data Flow

```
Airtable ("Student Truth" table)
    ↓  Airtable API (filtered by Status + School Year)
Cloud Function: getPublicCumulativeEnrollment()
    ↓  httpsCallable (public, no auth)
AdminOverview.tsx → CumulativeEnrollmentChart.tsx
```

---

## 1. Backend: Cloud Function

**File:** `backend/functions/main.py` — `getPublicCumulativeEnrollment()`

### Caching (3-tier)

| Layer | TTL | Storage |
|---|---|---|
| In-memory dict | 5 min | Python process |
| Firestore document | 30 min | `cache/cumulative_enrollment` |
| Fresh Airtable fetch | — | Fallback when both miss |

### School Year Grouping

Records are grouped by their **School Year** field value (e.g. `"2026-2027"`, `"2025-2026"`). Up to 4 school years are fetched in parallel via `ThreadPoolExecutor`.

Each school year is bounded by **Jan 1 – Dec 31** of the first year in the label (e.g. "26-27" → Jan 1 2026 – Dec 31 2026). Enrollment dates outside these boundaries are clamped to the nearest edge.

---

## 2. How Records Are Counted

### Enrolled Records — `_fetch_enrolled_by_school_year()`

Filters the **Student Truth** table for:
- `Status of Enrollment` = `"Enrolled"` OR `"Enrolled After Count Day (no funding)"`
- `School Year` = target year

**Which date field is used?**

| School Year | "Enrolled" status | "Enrolled After Count Day" status |
|---|---|---|
| **2024-2025 only** | `Created` (record creation timestamp) | `Date Enrolled` |
| **All other years** | `Date Enrolled` | `Date Enrolled` |

> The 2024-2025 exception exists because early records lacked a `Date Enrolled` value, so `Created` serves as the proxy.

### Pending Records — `_fetch_pending_by_school_year()`

Filters for:
- `Status of Enrollment` = `"Pending Enrolled"`
- `School Year` = target year

Uses `Date Enrolled` if present, otherwise falls back to `Created`.

---

## 3. Date → Daily Count Aggregation

1. Each record's timestamp (UTC from Airtable) is converted to **America/Denver (MST)**.
2. The MST date is extracted as a `YYYY-MM-DD` string.
3. Records sharing the same date string are counted together, producing a dict:
   ```python
   {"2026-01-15": 3, "2026-01-16": 7, ...}
   ```

---

## 4. Building the Cumulative Series — `_build_cumulative_series()`

Iterates day-by-day from `start_date` to `min(end_date, today in MST)`:

```python
running_total = 0
for each day in range:
    running_total += daily_counts.get(day, 0)
    series.append({
        "dayOfYear": days_since_start,   # 0-indexed, for x-axis alignment
        "date": "YYYY-MM-DD",
        "cumulative": running_total
    })
```

The series stops at **today (MST)** so future dates never appear on the chart.

---

## 5. Response Shape

```json
{
  "schoolYears": {
    "26-27": {
      "series": [{"dayOfYear": 0, "date": "2026-01-01", "cumulative": 0}, ...],
      "total": 412
    },
    "25-26": { ... }
  },
  "currentYear": "26-27",
  "windowLabel": "Jan 1 - Dec 31",
  "pendingData": {
    "26-27": {
      "series": [{"dayOfYear": 0, "date": "2026-01-01", "cumulative": 0}, ...],
      "total": 45
    }
  }
}
```

---

## 6. Frontend Rendering

**File:** `frontend/src/components/admin/CumulativeEnrollmentChart.tsx`

- Each school year is a separate line; the current year is visually highlighted.
- Year lines are toggleable on/off.
- **Pending line** is dashed and semi-transparent, showing enrolled + pending combined.
- **X-axis** uses `dayOfYear` so all years align to the same Jan–Dec timeline.
- **Y-axis** is cumulative enrollment count.
- Auto-refreshes every 60 seconds from `AdminOverview.tsx`.

---

## Key Files

| Role | Path |
|---|---|
| Cloud Function (data fetch + aggregation) | `backend/functions/main.py` |
| Frontend service wrapper | `frontend/src/services/adminService.ts` |
| Dashboard page (data orchestration) | `frontend/src/pages/admin/AdminOverview.tsx` |
| Chart component | `frontend/src/components/admin/CumulativeEnrollmentChart.tsx` |
