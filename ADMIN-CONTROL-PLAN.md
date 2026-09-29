# Admin Portal — "Control Everything" Plan

*Planning pass, 30 Sep 2026. Based on a full inventory of admin routes, controllers and
frontend, compared against the teacher and parent portals.*

## Goal

Make the admin portal able to **control every single thing** in the system: act on any
record, change any rule, manage any list, and do it without risking data loss.

**Decisions taken**

| Question | Decision |
|---|---|
| Teacher actions (attendance, absences, medication, growth, progress) | **Admin acts directly**, attributed to the admin account in the audit log. No impersonation. |
| Hardcoded/config values | **Settings table + `/admin/settings` UI**, with code `config()` as the fallback default. |
| Fixed lists (classes, blood types, relationships, …) | **DB-managed and editable**, served to both backend validation and frontend forms. |
| Destructive deletes | **Fix first** — before adding more admin power. |
| Sequencing | Safety first, then **A → C → B → E → D → F**. |

---

## Phase F — Delete & data safety *(build first)*

Deleting a student currently **cascades through 13 tables**, permanently destroying
payments, progress photos, chat history, attendance and contacts. An admin mis-click is
unrecoverable.

- [ ] **F1 Student delete becomes archive-only.** Remove hard delete for `active` students
      (already guarded) *and* for withdrawn/graduated; replace with archive + a separate,
      explicit "permanently erase" action that requires typing the child's name.
- [ ] **F2 Soft deletes** on `FinancialRecord`, `Memo`, `Guardian`, `EmergencyContact`,
      `AuthorisedCollector`, `AbsenceRequest`. `Message` already has them.
- [ ] **F3 A "Recently deleted" screen** — restore anything soft-deleted, with who/when.
- [ ] **F4 Fix orphaned media.** `media:prune-photos` only prunes attendance + progress
      photos; message attachments and absence documents are never cleaned up.
- [ ] **F5 Guardian primary reassignment** on delete.
- [ ] **F6 Admin accounts cannot be deleted by themselves** as a footgun guard
      (currently any user can delete their own account, including the only admin).

## Phase A — Admin can act everywhere a teacher can

Today admin can *see* these but not *act*. ~15 routes exist for teacher/parent with no admin
equivalent.

- [ ] **A1 Attendance** — admin register view; mark arrival; mark-all-present;
      **check out with collector verification** (reuse the safeguarding flow).
- [ ] **A2 Absences** — approve / decline, with attendance sync.
- [ ] **A3 Medication** — mark given / declined.
- [ ] **A4 Growth** — record height/weight/BMI.
- [ ] **A5 Activities & Progress** — record for any child.
- [ ] **A6 Daily updates** — view any class's submissions.
- [ ] **A7 Absence / medication requests on behalf of a parent** — admin-filed requests.
- [ ] **A8 Child profile editing** from the admin side (parity with the parent form).
- [ ] **A9 Chat** — admin can **send** in any thread, and a **UI for the message delete
      the backend already permits**.
- [ ] **A10 Policy layer** — extend `User::canManage()` / add an admin gate so these reuse
      the existing controllers rather than duplicating logic.

**Every A-action writes an `ActivityLog` entry attributed to the admin.**

## Phase C — Editable lists

All of these are PHP constants today, **duplicated in the frontend** (so they can drift).

- [ ] **C1** `classes` (5 Tahun / 6 Bintang → opens the door to multi-centre)
- [ ] **C2** `blood_types`, `immunisation_statuses`, `genders`, `nationalities`
- [ ] **C3** `guardian_relationships`, `emergency_relationship`
- [ ] **C4** `absence_types`
- [ ] **C5** `daily_activity_fields` (the 12 PERMATA/KSPK checkboxes)
- [ ] **C6** `progress` options (PERMATA / FREE / DEVELOPMENT / GRADES)
- [ ] **C7** `ethnicity`, `religion` (currently free text)
- [ ] **C8** Serve lists from the server to the frontend so there is **one source of truth**;
      remove the duplicated constants in `resources/js`.

## Phase B — Editable settings + money

- [ ] **B1 `settings` table + `/admin/settings`** with grouped tabs. Code reads
      `setting('x', config('y'))` so nothing breaks if a row is missing.
- [ ] **B2 Fees** — create/version/deactivate `FeeSetting` (currently update-only, two fields).
- [ ] **B3 Financial records** — admin can edit **amount, month, due date, overtime**
      (today: create + delete but no field edit).
- [ ] **B4 Due-date day** — currently hardcoded to the 7th.
- [ ] **B5 Stripe `Payment` transactions** — admin list/detail (and refund, if desired).
- [ ] **B6 Media/photo settings** — retention days, watermark on/off, max upload, target size.
- [ ] **B7 Operational rules** — absence `MAX_DAYS`, request windows, chat edit window,
      message length/attachment limits, reminder lead days.
- [ ] **B8 Scheduler visibility** — show when `media:prune-photos` and `fees:send-reminders`
      last ran, and whether cron is actually running.

## Phase E — Oversight views

- [ ] **E1 Student detail page** — it currently **does not show absences, medication or
      growth at all**. Add them, plus inline edit.
- [ ] **E2 Activity log** — filter by user / action / date range; CSV export.
- [ ] **E3 Conversations** — send, delete, reassign the assigned teacher, archive/close.
- [ ] **E4 Dashboard** — date range, month-over-month, and actionable "unpaid this month" /
      "not checked in today" tiles that link through.

## Phase D — Admin account management

- [ ] **D1** There is **no way to create, edit or delete an admin account** — they are
      seeder-only. Add an admin-users screen (create, reset password, deactivate).
- [ ] **D2** Guard against removing the last active admin.

---

## Open questions to settle as we go

1. **Admin chat sending** — should admin messages appear as the admin, or as "PPAK Office"?
2. **Refunds** — does the centre ever need to refund a Stripe payment, or is marking a
   record unpaid enough?
3. **Multi-centre** — Phase C1 (editable classes) is the prerequisite. Is a second *centre*
   (beyond class) in scope?
4. **"Permanently erase"** — do you ever legitimately need it (e.g. PDPA erasure requests),
   or should archive be the only path?

## Progress log

_Append as each phase lands._

| Phase | Status |
|---|---|
| F — Delete safety | not started |
| A — Admin acts everywhere | not started |
| C — Editable lists | not started |
| B — Settings + money | not started |
| E — Oversight views | not started |
| D — Admin accounts | not started |
