# Fix Plan — UI/UX Review + UAT Report (Nov 2026)

This plan combines two independent reviews of the live `ppakuthm.com` build:

- **[`UI-UX-REVIEW.md`](UI-UX-REVIEW.md)** — 76 screenshots across admin desktop, teacher mobile and parent mobile.
- **[`UAT-REPORT-PPAKUTHM-2026-11-26.md`](UAT-REPORT-PPAKUTHM-2026-11-26.md)** — 48 UAT scenarios: **26 PASS / 17 FAIL / 5 BLOCKED**.

> **Security note:** the archived report has the demo passwords redacted. The original untracked
> copy contains plaintext credentials and must never be committed.
>
> **Implementation status (26 Nov 2026):** the code-side fixes for this plan and the UI/UX review
> shipped in `d2d2e78`. Live deployment, the DB/photo backup and the clean demo reseed are still
> pending server access.

---

## 1. What the UAT report changes

The UAT confirms that the core RBAC is sound: parent child-IDOR, cross-role URLs, teacher scope for
the *assigned* UAT teacher, message isolation, memo targeting, IDOR on photos and the fee-due
boundary all passed. The failures are concentrated in **auth failure handling, attendance/absence
reconciliation, validation, and missing product capabilities**.

| UAT ID | Finding | Type | Severity |
|---|---|---|---|
| **Login 500** (report header, ADM-18) | Wrong, pending and inactive logins return HTTP 500 instead of a validation message | **BUG** | High |
| **ADM-05** | No “Inactive/Deactivate” account status; only Pending/Active/Awaiting/Rejected | Gap/UX | Medium |
| **ADM-11** | Attendance **check-ins are not audited** (checkout is) | **BUG** | Medium |
| **ADM-12** | Admin cannot edit/delete an existing progress record | Gap | Blocked |
| **ADM-15** | Negative overtime is rejected server-side but the dialog shows **no error** | **BUG/UX** | Medium |
| **ADM-20** | Future DOB silently dropped; malformed IC/phone accepted | **BUG** | Medium |
| **ADM-21** | Duplicate “List created class” log; memo/registration dates show 25 Nov for 26 Nov actions | **BUG** | Low |
| **TCH-03** | Attendance cannot mark **Absent / Late / Excused**; approved absences don’t affect the register | **BUG/Gap** | High |
| **TCH-04** | Backdated view submits **today’s date** for check-in | **BUG** | High |
| **TCH-05** | Future attendance (`2026-12-31`) is accepted; no edit window | **BUG/Policy** | High |
| **TCH-07** | No gradebook/assignments/numeric grades/publish flow | Gap | Blocked |
| **TCH-09** | Teacher cannot publish announcements (memos are admin-only) | Gap | Blocked |
| **TCH-11** | Approved absence does not update the teacher register | **BUG** | High |
| **PAR-06** | Past-dated absence accepted | **BUG** | Medium |
| **PAR-07** | Same-day absence accepted after check-in/out, then approved; register conflicts | **BUG** | High |
| **PAR-09** | Parent cannot download fee receipts (admin can) | Gap | Medium |
| **ADM-04** | Two parent **accounts** per student unsupported (guardians are contacts only) | Gap | Blocked |
| **ADM-08** | No academic years/terms/sections/subjects | Gap | Blocked |
| **E2E-02…05** | Cross-role loop fails because “Absent”, numeric grades and Excused do not exist | Dependency | High |

### Likely root cause of the login 500 (high confidence)

The failed/pending login paths call `Log::warning()`; the successful path does not. The container
entrypoint runs `artisan` as **root**, which can create `storage/logs/laravel.log` owned by root;
Apache runs as `www-data` and cannot append. That exactly matches “correct login works, wrong
password/pending login returns 500”.

**Diagnose first:** reproduce once, then check `storage/logs/laravel.log` ownership and
`docker compose logs app`. **Fix:** set `LOG_CHANNEL=stderr` for containers (logs go to Docker), add
`chown -R www-data:www-data storage bootstrap/cache` after entrypoint commands, and add Pest tests for
invalid/pending/inactive logins. Do not expose `APP_DEBUG=true` publicly.

---

## 2. Decision gates

These are **product decisions**, not bugs. The plan cannot be “full-fledged” until they are
answered.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Gradebook / numeric grades** | Build a full assignments/exams/gradebook module, or formally descope | **Descope.** This is a kindergarten; progress ratings + growth + notes are the analogue. Building a numeric gradebook is a separate large feature. Document it as N/A in the UAT report. |
| D2 | **Academic years / terms / sections / subjects** | Build, or descope | **Descope.** Centres + classes are the product model. Adding years/terms/subjects is a new module, not a bug fix. |
| D3 | **Attendance statuses** | (a) Minimal: fix reconciliation + add an explicit “Absent” override, keep Late/Excused out. (b) Full: add Present/Absent/Late/Excused + reason + edit window | **Minimal first** for the demo. Full statuses are a worthwhile follow-up but touch migrations, stats, parent views, absence flows and reports. |
| D4 | **Two parent accounts per student** | Add a `student_parent` pivot/co-parent accounts, or descope | **Descope for now.** Guardians/emergency contacts cover the safety need. A second portal login is an auth/data-model change. |
| D5 | **Teacher announcements** | Allow teachers to publish class-scoped memos, or keep admin-only | **Implement.** It is a small policy/UI change and closes a real communication gap. |
| D6 | **Parent fee receipts** | Add a parent receipt download, or leave admin-only | **Implement.** Small route + policy + button; high perceived value. |
| D7 | **UAT data** | Reseed a clean demo, or delete UAT records manually | **Back up, then reseed** after the fixes. The live DB has UAT Class A, UAT teacher/parent/student, a future 31 Dec attendance record, same-day absences and reset passwords. Preserve the UAT report/screenshots as evidence. |

---

## 3. Workstream A — UAT fixes

### A1. Auth and accounts

| ID | Fix | Effort | Acceptance |
|---|---|---|---|
| **A1.1 Login failure path** | Set container logging to `stderr`; fix `storage/logs` ownership in the entrypoint; confirm wrong/pending/inactive logins return a redirect/422 with a clear message | S | Invalid, pending, inactive and valid logins all behave; no HTTP 500; test for each |
| **A1.2 Inactive/deactivate** | Add `Inactive` to `AccountStatus`; add “Deactivate” UI action (with confirmation); keep session revocation via `account.active` | S/M | Deactivated user is logged out on next request; reactivation works; last-admin guard still holds |
| **A1.3 Credential reconciliation** | Document/reset the demo credentials after the UAT; do not commit passwords | S | Three known demo logins verified; `demo-accounts.txt` contains no deployed passwords |

### A2. Attendance and absences

| ID | Fix | Effort | Acceptance |
|---|---|---|---|
| **A2.1 Selected date** | Pass the register date through `AttendanceActions` → check-in form → controller; never default to today when a past date is open | S | Checking in on 25 Nov creates a 25 Nov row; today is unchanged |
| **A2.2 Future/edit window** | Decide the policy (recommended: today + 0 days for arrival; maybe a 7-day correction window); enforce server-side; hide future dates in the UI | S/M | 31 Dec API request is rejected; tests for the window |
| **A2.3 Approved absence → register** | On approval, upsert `attendance` rows for every covered day with `absence_request_id`/`absence_type`; recompute stats; clear on decline | M | Teacher and parent registers both show Absent; count updates; 26/27 Nov tests |
| **A2.4 Parent absence validation** | Reject past dates (with a defined grace window); reject same-day requests when attendance exists; block overlaps | S | 20 Nov rejected; 26 Nov after check-in/out rejected; end-before-start still rejected |
| **A2.5 Explicit absent/late/excused** | If D3 = minimal: add an “Absent” action with reason and audit; if D3 = full: add statuses + reason + edit window | S (minimal) / M/L (full) | UAT TCH-03/E2E expectations either pass or are explicitly documented as descoped |
| **A2.6 Check-in audit** | `ActivityLog::record('attendance.arrived', …)` on check-in (including mark-all), with date/temperature | S | Activity log shows every check-in, not just checkout |
| **A2.7 Same-day reconciliation** | If an absence is approved for a day with a check-in, flag/require resolution; do not leave both “Back home” and “Approved absence” | S/M | UAT PAR-07 no longer produces a contradictory day |

### A3. Progress, validation and audit

| ID | Fix | Effort | Acceptance |
|---|---|---|---|
| **A3.1 Admin progress override** | Add Edit/Delete to the admin progress history; reuse the progress form; audit `progress.updated/deleted` | S/M | Admin can correct/remove a teacher record; audit entry exists |
| **A3.2 Future DOB / IC / phone** | Reproduce the silent drop; enforce `before_or_equal:today` with visible errors; add IC/phone format rules to students, parents, teachers, guardians and collectors | S/M | Future DOB returns a visible validation error; `123`/`abc` rejected with messages |
| **A3.3 Negative overtime feedback** | Show `errors.overtime_hours` (and generic form errors) in the Add Payment dialog | S | Negative overtime shows an inline error; dialog does not look “stuck” |
| **A3.4 Duplicate list log** | Remove the duplicate `ActivityLog::record` on list creation | S | One entry per new class/list option |
| **A3.5 Timezone/date consistency** | Use the app timezone consistently for memo/registration/activity dates; test around midnight MYT | S/M | A 00:56 MYT action shows 26 Nov everywhere; no 25 Nov/26 Nov split |
| **A3.6 Parent receipts** | Add a parent receipt route for own fee records; link paid rows; enforce ownership | S | Parent can download a receipt; another family’s record returns 403 |
| **A3.7 Teacher announcements** | Allow teachers to create a memo scoped to their class/centre (audience locked); admin can moderate | M | Teacher sees “New memo” on Teacher → Memos; only their class receives it |

### A4. Product gaps to document (unless the decision changes)

- Gradebook/assignments/numeric grades/publish (D1) — **descope**; document N/A.
- Academic years/terms/sections/subjects (D2) — **descope**; document N/A.
- Two parent accounts (D4) — **descope**; guardians are contacts.
- Parent “invoice” PDF — receipt PDF is the equivalent; add it (A3.6).
- Late/Excused (D3) — either minimal absent override or full statuses.

---

## 4. Workstream B — UI/UX fixes

The full evidence and screenshots are in [`UI-UX-REVIEW.md`](UI-UX-REVIEW.md). The implementation
order:

### B1. Shell and navigation

| ID | Fix | Effort |
|---|---|---|
| **B1.1 Page titles/nav** | Add `/admin/register/messages` to the Teacher views nav; pass a per-page title for child detail/messages; never fall back to “Dashboard” | S |
| **B1.2 Duplicate titles** | One title per breakpoint; remove extra H1s/card headers (Messages ×3, Attendance ×2, etc.) | S |
| **B1.3 Profile shell** | Move `Profile/Edit` from `AuthenticatedLayout` to the role `AppShell`; two-column profile/security cards | M |
| **B1.4 Unread counters** | Differentiate the messages icon + notification bell (labels/colors); avoid two identical red badges | S |
| **B1.5 Mobile search** | Add a search icon/full-screen sheet for teacher/parent | S |

### B2. Mobile usability

| ID | Fix | Effort |
|---|---|---|
| **B2.1 Bottom-nav overlap** | Sticky action bar above the nav for long forms; safe-area padding; hide nav in chat threads | S/M |
| **B2.2 Long names/overflow** | Two-line child names or display name + class; child dropdown instead of cut-off pills; fix conversation-row flex | S |
| **B2.3 Conversation list** | Show timestamp + unread badge on every role; two-line row | S |
| **B2.4 Progress labels** | Label Activity performance / Skill mastery / Development area; remove duplicate “Good Good” ambiguity | S |
| **B2.5 Attendance controls** | Yes/No segmented controls or switches; “Mark all No” / “Copy yesterday” | M |
| **B2.6 Parent child detail** | Tabs/accordions (Overview / Health / Progress / Attendance); compact empty states; show “No known allergies” | M |
| **B2.7 Financials** | Fix amount wrap; combine Overdue/Unpaid; tappable month rows; Stripe-unavailable message | S |
| **B2.8 Memos** | Audience/class/centre tag; unread state; search/filter | S/M |

### B3. Admin consistency and safety

| ID | Fix | Effort |
|---|---|---|
| **B3.1 Teacher scope defaults** | Require class/centre; explicit unrestricted flag; audit existing teachers; scope chips in list | M |
| **B3.2 Fee generation scope** | Scope to active centre; preview count/total; confirm | S |
| **B3.3 Scheduler status** | “Not run yet” neutral state; next run/heartbeat; warn only when stale | S |
| **B3.4 Lists admin** | Auto-slug from label; label sort; hide technical values; explain “in use” | S/M |
| **B3.5 Memo centre** | Show/require the target centre when “All centres” is active | S |
| **B3.6 Add parent/child link** | Add a children multi-select or a post-create “Link child” action | M |
| **B3.7 Add student** | Require class; capture allergies/medical at enrolment or prompt after | M |
| **B3.8 Payment previews/confirm** | Amount preview for Add Payment; count/total for Generate; confirm Mark paid/unpaid with undo | S |
| **B3.9 Fee settings** | Rename Save vs New version; guard deleting active rates | S |
| **B3.10 Transactions** | Show “Stripe not configured / test mode” | S |
| **B3.11 Allergy banner** | Show allergens in the Alerts banner | S |
| **B3.12 Activity log colors** | Color-code create/update/delete | S |

### B4. Polish (P2)

- Date formats (ISO vs human) and “Updated by the teacher” microcopy.
- Touch targets (month checkboxes, delete icons) and 12px+ helper text.
- Loading skeletons and a “Reconnecting…” indicator when Reverb drops.
- Notifications bottom-sheet with a close button.
- Empty-state copy per section.
- Support link label (`mailto:` vs page).
- Admin Teacher messages vs Conversations: explain the two chat views.

---

## 5. Combined execution phases

### Phase 0 — Decisions, diagnostics, safety (0.5–1 day)

- Answer D1–D7.
- Reproduce the login 500; inspect `storage/logs` and container logs; fix logging (A1.1).
- Take a fresh DB + photo backup before any data work.
- Archive the UAT report **with credentials redacted**; keep the screenshot gallery local.
- Decide the attendance model (D3) and the demo deadline.

### Phase 1 — Data integrity and security (4–5 days)

- A1.1 login failure path, A1.2 inactive status, A1.3 credentials.
- A2.1 date, A2.2 future window, A2.3 approved absence reconciliation, A2.4 parent validation, A2.6 audit, A2.7 conflict.
- A2.5 absent/late/excused per the D3 decision.
- A3.1 admin progress override, A3.2 validation, A3.3 negative overtime, A3.4 duplicate log, A3.5 timezone.
- B3.1 teacher scope defaults + audit existing teachers.
- B3.2 fee generation scope + preview.
- Tests for every item.

**Exit criteria:** no HTTP 500 on any login path; teacher scope, attendance/absence, fee generation and validation tests pass; UAT high-severity bugs are fixed or explicitly descoped.

### Phase 2 — Core UX and demo polish (4–5 days)

- B1.1–B1.5 shell/nav/profile/titles/unread/search.
- B2.1–B2.5 mobile CTA, names, conversation list, progress labels, attendance controls.
- B3.3 scheduler, B3.4 lists, B3.5 memo centre, B3.8 payment previews, B3.10 Stripe, B3.11 allergy banner.
- A3.6 parent receipts, A3.7 teacher announcements (if D5/D6 = yes).

**Exit criteria:** screenshots at 1440×900 and 390×844 show correct titles/nav, profile in the app shell, no clipped primary actions, readable conversation rows, labeled progress, clear attendance controls.

### Phase 3 — Remaining UI polish and gaps (2–4 days)

- B2.6 child detail tabs, B2.7 financials, B2.8 memos.
- B3.6/3.7 parent-child link and enrolment fields.
- B3.9 fee settings, B3.12 activity colors, B4 polish.
- Product gaps per D1/D2/D4 (likely documentation only).

### Phase 4 — Verification and deployment (1–2 days)

- Pest on SQLite **and Postgres**; Pint, PHPStan, ESLint, `tsc`, build, route check.
- Re-run the headless screenshot pass at 1440/390; spot-check every changed screen.
- Replay the 48 UAT scenarios; target **0 HTTP 500, no open High bugs**, product gaps documented.
- Back up; reseed a clean demo (D7); reset the three demo passwords; `DEMO_SEED=false`.
- Deploy; smoke-test `/up`, login, attendance, chat, photo, fee/receipt.
- Archive the final UAT report with credentials redacted.

---

## 6. Acceptance criteria (the important ones)

1. **Auth:** valid, wrong, pending, inactive and deactivated logins all produce the expected result
   with no 500; the log path works for `www-data`.
2. **Teacher scope:** a teacher assigned to 5 Tahun/centre A cannot see, message or assess
   6 Bintang/centre B; an unassigned teacher sees nothing until assigned.
3. **Fee generation:** generating November for centre A creates no records for centre B; the dialog
   shows the count/total before confirming.
4. **Attendance:** checking in on 25 Nov creates a 25 Nov record; 31 Dec is rejected per policy;
   an approved absence appears as Absent in the teacher and parent registers; check-ins are audited.
5. **Absence validation:** past dates and same-day conflicts are rejected; end-before-start remains
   rejected; overlapping requests are rejected.
6. **Progress:** admin can edit/delete a record; the parent sees labeled ratings; the audit log
   records the change.
7. **Receipts:** a parent can download a receipt for their own child only; another family’s record
   returns 403.
8. **UI:** child detail/messages show the correct top-bar title; Profile is inside the app shell;
   parent/teacher mobile primary actions are not hidden behind the bottom nav; conversation rows
   show time/unread; progress/attendance controls are self-explanatory.
9. **Timezone:** a 00:56 MYT action shows the same date in memos, registrations and the activity log.
10. **UAT replay:** no HTTP 500; all High failures fixed or explicitly descoped; the 5 blocked
    scenarios documented as product decisions.

---

## 7. Demo-critical subset (if time is short)

If the supervisor demo is soon, ship this first — roughly **6–8 working days**:

1. Login 500 fix + invalid/pending/inactive tests.
2. Teacher scope defaults + audit.
3. Attendance date + approved-absence reconciliation + parent absence validation + check-in audit.
4. Fee generation centre scope.
5. Shell titles/nav + Profile shell.
6. Mobile bottom-nav/CTA, conversation list, progress labels, attendance controls.
7. Backup + clean reseed + password reset.

Descope gradebook, academic years and two-parent accounts; document them as N/A. Add parent
receipts and teacher announcements if there is room.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Attendance/absence changes affect stats, notifications and reports | Add focused tests; keep the existing derived status as a fallback; migrate data carefully |
| Teacher scope changes hide data for seeded teachers | Audit existing teachers first; assign centres/classes; show an “unassigned” warning |
| New `Inactive` status touches auth | Test login, session revocation, reactivation and the last-admin guard |
| Timezone fixes shift displayed dates | Test around midnight MYT; compare activity log, memos and registrations |
| Profile shell change touches all roles | Test admin/teacher/parent at 1440 and 390 |
| UAT data cleanup loses evidence | Back up DB + photos; keep the UAT report/screenshots locally |
| Credentials leak | Redact the UAT report; never commit passwords; rotate demo passwords after UAT |

---

## 9. Open questions

1. **Deadline:** when is the supervisor demo?
2. **D1/D2:** confirm gradebook and academic years are descoped (recommended), or are they required?
3. **D3:** minimal absent override or full Late/Excused statuses?
4. **D4:** descope two parent accounts?
5. **D5/D6:** implement teacher announcements and parent receipts? (recommended yes)
6. **D7:** reseed the demo after fixes, or preserve the UAT records?
7. Should the UAT report be archived under `docs/` after redacting the passwords?
