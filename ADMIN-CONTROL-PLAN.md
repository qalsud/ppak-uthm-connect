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
| Student removal | **Archive only.** No hard delete of children at all (PDPA erasure not required). |
| Sequencing | Safety first, then **A → C → G → B → E → D**. |
**Settled follow-ups**

1. **Admin chat messages** appear **as the admin** (real name in the thread).
2. **Stripe refunds** are in scope — admin can refund a payment (Phase B5).
3. **Two centres** are in scope: **Tadika Khalifah Junior** and **Taska Hikmah UTHM**. See Phase G.
4. **No "permanently erase"** — archive is the only path for child records.

**Centre decisions (Phase G)**

| Question | Decision |
|---|---|
| Default centre for existing/historical data | **Tadika Khalifah Junior** |
| Can a child move centre? | **No** — a move starts a fresh record at the new centre |
| Do parents see the centre name? | **Yes** |
| Can a teacher work at both centres? | **Yes** — a teacher may belong to more than one |

---

## Phase F — Delete & data safety *(build first)*

Deleting a student currently **cascades through 13 tables**, permanently destroying
payments, progress photos, chat history, attendance and contacts. An admin mis-click is
unrecoverable.

- [ ] **F1 Student delete becomes archive-only.** Remove hard delete for `active` students
      (already guarded) *and* for withdrawn/graduated; replace with archive. **No permanent
      erase** — archive is the only path (decided).
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
- [ ] **A9 Chat** — admin can **send** in any thread **as the admin**, and a **UI for the
      message delete the backend already permits**.
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

- [x] **B1 `settings` table + `/admin/settings`** with grouped tabs. Code reads
      `setting('x', config('y'))` so nothing breaks if a row is missing. ✅
- [x] **B2 Fees** — versioned rates: create a new version (retires the old), deactivate,
      plus **per-centre overrides** (`fee_settings.centre_id`, closes **G-i5**). ✅
- [x] **B3 Financial records** — admin can edit **amount, month, due date, overtime**. ✅
- [x] **B4 Due-date day** — now `setting('fees.due_day', 7)`. ✅
- [ ] **B5 Stripe `Payment` transactions** — admin list/detail **and refund**.
- [x] **B6 Media/photo settings** — retention days, watermark on/off, max upload, target size. ✅
- [x] **B7 Operational rules** — absence `MAX_DAYS`, chat edit window, message
      length/attachment limits, reminder lead days. ✅
- [x] **B8 Scheduler visibility** — `media:prune-photos` and `fees:send-reminders` stamp their
      last run; `/admin/settings` shows it and flags a stale schedule. ✅

## Phase E — Oversight views

- [ ] **E1 Student detail page** — it currently **does not show absences, medication or
      growth at all**. Add them, plus inline edit.
- [ ] **E2 Activity log** — filter by user / action / date range; CSV export.
- [ ] **E3 Conversations** — send, delete, reassign the assigned teacher, archive/close.
- [ ] **E4 Dashboard** — date range, month-over-month, and actionable "unpaid this month" /
      "not checked in today" tiles that link through.

## Phase G — Two centres

The centre names exist today only in the landing copy. Everything is one flat dataset, and
**`class` alone stops being a valid key** once "5 Tahun" exists at both centres — so
`class` must become *class within centre* throughout.

Centres: **Tadika Khalifah Junior** · **Taska Hikmah UTHM**

**Order matters.** G3 (access control) must land before any centre-scoped UI, or the
cross-centre leak in `canManage()` widens with every screen added.

- [x] **G0 Access-control foundation.** *Done* (`7ac8415`) - centre is part of the access check.
      class *string*, so a `5tahun` teacher at one centre can manage the other centre's
      `5tahun` children. Make centre part of the comparison, and give `assignedClass()`
      a centre context. Nothing else is safe until this is true.
- [x] **G1 `centres` table** + `centre_id` on `students`, `users` (staff), `memos`,
      `fee_settings`, `list_options`.
- [x] **G2 Backfill** existing records to **Tadika Khalifah Junior** — idempotent so the
      seeder stays re-runnable.
- [x] **G3 Class becomes centre-scoped.** `list_options.centre_id` finally used, `class`
      keys unique per centre, and every class query filtered through the centre.
      Touches attendance, activities, progress, updates, messages, memos, payments, CSV.
- [x] **G4 Admin centre switcher** — `ActiveCentre` (session-backed) + switcher in the app shell. "All centres" is the default. ✅ `c85d962`
- [x] **G5 Centre CRUD** at `/admin/centres`. Centres are deactivated, never deleted. ✅ `c85d962`
- [x] **G6 Centre assignment** on students (form + validation). ✅ `c85d962`
- [x] **G7 Scoped access** - teachers assigned to one or many centres; parents scoped via their children. *Done* (`4e634f0`)
      **Teachers may belong to more than one centre** (assigned via `users.centre_id`
      being nullable or a pivot — decide during G1).
- [~] **G8 Per-centre fees** - dashboard money is centre-scoped, but fee RATES and generation are still global (see G-i5).
- [x] **G9 Per-centre dashboard** - class split derives from the live class list; stats/charts respect the active centre. *Done* (`4e634f0`)
- [x] **G10 Memos** - centre field + centre-aware admin list; the teacher-memo leak was fixed in G3. *Done* (`4e634f0`)
      `Teacher\MemoController` returns *every* class-audience memo to *every* teacher.
- [x] **G11 Parents see the centre name** in the portal. *Done* (`4e634f0`)

**Known cross-centre leaks to close during G (from the reconnaissance)**

| Leak | Where |
|---|---|
| `canManage()` string-only compare | `app/Models/User.php:110-122` |
| Message fan-out hits the wrong centre's class + all unrestricted staff | `ConversationService::teachersFor():191-194` |
| Teacher memo list returns every class memo, unfiltered | `app/Http/Controllers/Teacher/MemoController.php:16` |
| Parent notifications go to **all** active teachers | `Parent/DailyUpdateController:76-84`, `Parent/AbsenceController:81-88` |
| Memo "class" recipients include **all** teachers | `Admin/MemoController:105-111` |
| `Student::CLASSES[0]` / `'5tahun'` hardcoded fallbacks | `Teacher/AttendanceController:48,184`, `Teacher/DailyUpdateController:18` |
| `orderBy('class')->value('class')` picks across centres | `Teacher/AttendanceController:44-48` |
| CSV `normaliseClass()` cannot disambiguate | `Admin/StudentController:357-370` (also C-i3) |
| Notification deep-link ambiguous across centres | `DailyUpdateSubmittedNotification:28` |

## Phase D — Admin account management

- [ ] **D1** There is **no way to create, edit or delete an admin account** — they are
      seeder-only. Add an admin-users screen (create, reset password, deactivate).
- [ ] **D2** Guard against removing the last active admin.

---

## Open questions to settle as we go

_(All initial questions settled — see "Settled follow-ups" and "Centre decisions" above.)_

## Issue register

Found during a phase, deliberately **deferred to a later pass** — reviewed after each phase
completes. Nothing here is a blocker; it is a debt list.

### Still open

| # | Issue | Impact | Where |
|---|---|---|---|
| G-i5 | `FeeSetting` is global — one rate for both centres | Per-centre fee rates impossible | `Admin/PaymentController`, `FeeSetting` — **closes in Phase B** |

_Everything else that used to be here was cleared or accepted on 30 Sep 2026 (see below)._

### Accepted by decision (documented, no code change)

| # | Issue | Decision |
|---|---|---|
| **G-i11** | `list_options` is global — class lists are not per-centre | **Accepted.** A single shared class list is intentional. `centre_id` already makes `class` a centre-scoped key on every query (`Student::scopeVisibleTo`, the class filter, attendance/memo/message scoping), guarded by 16 isolation tests. Per-centre lists would add admin UI + validation complexity for a case that isn't needed — revisit only if one centre must offer a class the other must not. Guarded by the test *"the class list is shared across centres by design"*. |
| **C-i5** | Migration enum-ish defaults (`students.class` default `5tahun`, `progress_records` default `Select`) | **Accepted (documented).** DB defaults only apply to inserts that omit the column, and both are always supplied by validation. A migration to strip them is more risk than value. |
| **C-i8** | `PaymentController::MONTHS` is not a manageable list | **Accepted.** Months are fixed; a settings-backed month list adds no value. |
| **G-i12** | Dev DB needed a re-seed after adding centres | Informational — not a bug. Struck from the register. |

### Cleared (kept for the record)

**Register-clearing pass 2 (30 Sep 2026):** G-i3 (centre filter on the student/teacher lists),
G-i9 (unrestricted-staff UI warning), C-i4 (seeder values verified against the live lists),
C-i6 (progress PERMATA/free/development lists are now admin-editable),
C-i7 (daily-activity fields are now admin-editable — rename/reorder/hide; keys stay fixed columns).

**By Phase G:** G-i1 (class labels), G-i2 (CSV import), G-i4 (dashboard donut),
G-i6 (memo badges), G-i7 (notification deep-link), G-i8 (report counts),
G-i10 (memo centre field).

**By the register-clearing pass (`e6e2464`):** C-i1 (rating-chip tones),
C-i2 (duplicate of G-i1), C-i3 (duplicate of G-i2), C-i9 (free-text relationships).

### Progress log

_Append as each phase lands._

| Phase | Status |
|---|---|
| F — Delete safety | ✅ **done** (`9a407eb`) |
| A — Admin acts everywhere | ✅ **done** (`fdaa0c5`) |
| C — Editable lists | ✅ **done** (`1885857`) |
| G — Two centres | ✅ **done** except per-centre fee rates (`G8`) — `7ac8415` → `4e634f0` |
| Register clearing | ✅ **done** (`e6e2464`) |
| Register clearing 2 | ✅ **done** (30 Sep 2026) — G-i3, G-i9, C-i4, C-i6, C-i7 fixed; G-i11/C-i5/C-i8 accepted by decision |
| B — Settings + money | 🟡 **in progress** — B1/B2/B3/B4/B6/B7/B8 done (settings + `/admin/settings`; versioned per-centre fees, closes G-i5; record editing; due day; media; ops; scheduler). **B5 remaining** (Stripe refunds) |
| E — Oversight views | ⬜ not started |
| D — Admin accounts | ⬜ not started |
