# Investigation — K-6: Missing KPI Value Entries

**Ticket:** K-6 (P0) — Stephen entered a Facebook game-day attendance value during the 2026-05-07 demo; it didn't appear in history.

**Date of investigation:** 2026-05-07
**Investigator:** Claude (parallel agent for K-1/K-5/K-6/K-7 implementation)

---

## Reproduction Hypothesis

I do not have prod log access, prod DB access, or a way to talk to Stephen, so I cannot deterministically reproduce. The strongest *plausible* hypotheses, in priority order:

1. **Date timezone mismatch silently drops the entry off the visible chart/list** for users not in UTC. The user *thinks* the entry vanished but it's actually displayed under the previous day, or filtered out by a date comparison elsewhere.
2. **Backend swallowed an error.** The `POST /:id/history` handler (`backend/src/routes/kpis.ts` ~L294-358) writes the row, then calls `KPIService.updateKPIWithCalculations(id)`. The calculation step is wrapped in a `try/catch` that logs and continues, returning 201 — but if the *insert* itself succeeded silently (e.g., into the wrong KPI id due to a stale/garbage query param), the row exists but isn't visible from the KPI Stephen was looking at.
3. **React-query cache desync.** Inside `KPIDetailModal`, the mutation invalidates `['kpi-history', kpiId]`. `kpiId` is a closure capture from the modal's `props`; if Stephen had two KPI modals open in sequence and the close/open transition had stale state, the wrong cache key could be invalidated. Lower probability — confirmed by reading the code that the modal is keyed on a single `kpiId` prop.
4. **The handler returned the new row, but the frontend's `addHistoryMutation.onSuccess` doesn't push it directly into the cache** — it only invalidates. If the GET query is throttled or coalesced (it isn't, but if anything in the network layer were), the user could see "Adding…" complete, then no new row. Again, lower probability with current React Query defaults.

---

## Code Audit Findings

### Date timezone — CONFIRMED ISSUE (likely cosmetic, not the missing-entry root cause)

`backend/src/database/init.sql` defines:
```sql
recorded_date DATE NOT NULL,
```

`backend/src/config/database.ts` does **not** override `pg.types.setTypeParser` for OID 1082 (DATE). With default behavior, node-postgres parses DATE as a JS `Date` object set to **midnight in the Node process's local timezone**. In the Docker container the backend runs in (likely UTC), `2026-05-07` becomes `2026-05-07T00:00:00.000Z`.

The frontend then does:
```ts
format(new Date(h.recorded_date), 'MMM dd, yyyy')   // KPIDetailModal.tsx ~L652
format(new Date(h.recorded_date), 'MMM dd')         // KPIDetailModal.tsx ~L181
```

For a user in PST (UTC-8), `new Date('2026-05-07T00:00:00.000Z')` renders as **May 06**, off by one day. This is the classic JS Date timezone footgun.

This **does not cause entries to vanish**, but it does cause a date-shift that could plausibly explain "Stephen entered May 7, looked for May 7 in the list, saw May 6, decided it didn't save." If Stephen sorted/scrolled looking for "today" and didn't see today's date, he'd reasonably conclude it didn't log.

### Backend insert — looks correct

`POST /:id/history` validates `value !== undefined && recorded_date` and inserts. The console logs at L299, L321, L327 mean a successful insert is observable in server logs. No early-return path silently swallows.

### Status calculation side-effect — non-fatal

`KPIService.updateKPIWithCalculations(id)` is wrapped in try/catch at L339-345. If it throws, the route still returns 201. Good.

### Frontend mutation — looks correct

`KPIDetailModal.tsx:97-114` invalidates the correct keys (`['kpi-history', kpiId]`, `['kpi', kpiId]`, `['kpi-forecast', kpiId]`). `kpisApi.addHistory` posts the right payload. The `onError` shows an `alert()` — so a 4xx/5xx wouldn't be silent.

### Validation rules — could 400 silently?

The PUT handler has a validation block (L308-319) that returns 400 with `{ error: 'Validation failed', errors: [...] }`. The frontend `onError` does `alert(...)` so this would *not* be silent. However, if `validation_rules` is malformed JSON, `KPIService.validateKPIValue` could throw — but again wrapped in try/catch that just logs.

### Empty-history list path

`history && history.length > 0 ? <table> : <empty state>` — the empty state always renders if `history` is empty, so "I don't see my entry" must mean the GET returned an empty array (or the cache hadn't refetched). The mutation triggers an explicit invalidate, so a refetch should fire. **One subtle gap:** if the network was down or the response was 304 with stale data, but with React Query defaults, this would refetch on success.

---

## Suspected Root Cause

**Most likely:** Date timezone mismatch made Stephen's "today" entry appear as "yesterday" in the list, and he interpreted that as the entry being missing. The entry is in the database but visually displaced.

**Less likely but possible:** A genuine edge case during the demo (e.g., a network blip, a race between two rapid submits) that won't reproduce reliably.

---

## Recommended Fix

For the timezone bug — apply both:

1. **Backend:** in `backend/src/config/database.ts`, set a DATE type parser that returns the raw `YYYY-MM-DD` string instead of a Date object:
   ```ts
   import { types } from 'pg';
   types.setTypeParser(1082, (val: string) => val); // DATE OID = 1082
   ```
   Then `recorded_date` flows through as `"2026-05-07"` end-to-end.

2. **Frontend:** when displaying, parse the YYYY-MM-DD string as a *local* date so it doesn't shift:
   ```ts
   const parseLocalDate = (s: string) => {
     const [y, m, d] = s.split('-').map(Number);
     return new Date(y, m - 1, d);
   };
   format(parseLocalDate(h.recorded_date), 'MMM dd, yyyy')
   ```
   Or use `date-fns/parseISO` with care — `parseISO('2026-05-07')` correctly yields a local-midnight Date, which `format` will render as May 7 regardless of timezone.

A regression test should write a row with `recorded_date = '2026-05-07'` and assert that the GET response contains the same string (not a Date object shifted by timezone).

---

## Why I'm Not Fixing Here

I have not been able to reproduce Stephen's exact symptom (entry **completely** missing from history list). Without:
- Production logs showing the actual insert attempt
- A snapshot of `kpi_history` immediately after the demo
- Stephen's browser timezone
- The exact KPI he edited

…I'm guessing at the root cause. The timezone hypothesis is supported by code reading but I haven't confirmed it matches Stephen's symptom. The K-6 ticket explicitly says "do not patch symptoms" — applying the timezone fix without confirming it explains the bug would be exactly that.

**Recommended next steps for whoever follows up:**

1. Check production database for any `kpi_history` row created on 2026-05-07 around demo time. If it exists → confirms my hypothesis (data is there, just displayed wrong).
2. If it does *not* exist → much more serious; pull backend logs for that timestamp window and look for failed inserts or 5xx responses.
3. Once root cause is confirmed, ship the timezone fix above as the *first* change (it's a real bug regardless), then address whatever else surfaced.

---

## Observability Improvements (already in code, worth keeping)

The `POST /:id/history` route already has detailed `console.log` lines (`[KPI History] ...`) at every step. These will be invaluable for the next investigation. Do not strip them in a future cleanup pass.
