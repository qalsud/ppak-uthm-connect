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

- [ ] **B1 `settings` table + `/admin/settings`** with grouped tabs. Code reads
      `setting('x', config('y'))` so nothing breaks if a row is missing.
- [ ] **B2 Fees** — create/version/deactivate `FeeSetting` (currently update-only, two fields).
- [ ] **B3 Financial records** — admin can edit **amount, month, due date, overtime**
      (today: create + delete but no field edit).
- [ ] **B4 Due-date day** — currently hardcoded to the 7th.
- [ ] **B5 Stripe `Payment` transactions** — admin list/detail **and refund**.
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

## Phase G — Two centres

The centre names exist today only in the landing copy. Everything is one flat dataset, and
**`class` alone stops being a valid key** once "5 Tahun" exists at both centres — so
`class` must become *class within centre* throughout.

Centres: **Tadika Khalifah Junior** · **Taska Hikmah UTHM**

**Order matters.** G3 (access control) must land before any centre-scoped UI, or the
cross-centre leak in `canManage()` widens with every screen added.

- [ ] **G0 Access-control foundation (do first).** ✅ *done* (`7ac8415`) `User::canManage()` compares only a
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
- [ ] **G4 Admin centre switcher** — "All centres" vs a specific one, persisted per session.
- [ ] **G5 Centre CRUD** at `/admin/centres`.
- [ ] **G6 Centre assignment** on students and staff (forms + bulk).
- [ ] **G7 Scoped access** — teachers and parents only ever see their own centre.
      **Teachers may belong to more than one centre** (assigned via `users.centre_id`
      being nullable or a pivot — decide during G1).
- [ ] **G8 Per-centre fees** — rates and generation are per centre, not global.
- [ ] **G9 Per-centre dashboard/reports** — counts and charts split or filtered by centre.
- [ ] **G10 Memos** — audience gains a centre dimension; fix the existing leak where
      `Teacher\MemoController` returns *every* class-audience memo to *every* teacher.
- [ ] **G11 Parents see the centre name** in the portal.

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

### From Phase G — centres

| # | Issue | Impact | Where |
|---|---|---|---|
| G-i1 | `Student::classLabelStatic()` still hardcodes the two original keys | Backend class labels (PDF receipts, Stripe description) ignore renames **and** can't say which centre | `app/Models/Student.php` |
| G-i2 | CSV student import `normaliseClass()` coerces `'5'`/`'6'` | Cannot disambiguate the same class across centres; imports will mis-file or skip (also C-i3) | `Admin/StudentController:357-370` |
| G-i3 | Admin student/teacher lists have **no centre column or filter yet** | Two "5 Tahun" rows are indistinguishable in the UI | `Admin/Students.tsx`, `Admin/Teachers.tsx` |
| G-i4 | Admin dashboard class donut is **hardcoded to two classes** with no centre split | Under-counts / merges both centres (G9) | `Admin/DashboardController:56-59` |
| G-i5 | `FeeSetting` is global — one rate for both centres | Different rates per centre impossible until G8 | `Admin/PaymentController`, `FeeSetting` |
| G-i6 | `Parent/DashboardController` and `Teacher/DashboardController` use `Memo::count()` (global) | Memo badge is wrong once memos are centre-scoped | both dashboards |
| G-i7 | `DailyUpdateSubmittedNotification` deep-links `?class=` with no centre | A link can land on the wrong centre's register | `app/Notifications/DailyUpdateSubmittedNotification:28` |
| G-i8 | Report `data` counts (`stats.students` etc.) are global, not centre-split | G9 | `Admin/DashboardController:29-39` |
| G-i9 | Teachers/staff with **no centre assignment are unrestricted** (kept for backwards compatibility) | Correct today, but an admin could accidentally leave a teacher seeing all centres — worth surfacing in the UI | `User::centreIds()` |
| G-i10 | Memo `centre_id` is accepted by the API but the **memo form has no centre field yet** | Admin can't target a centre from the UI until G10 | `Admin/Memos.tsx` |
| G-i11 | `list_options` is still global — classes aren't yet scoped per centre | Both centres share one class list (G3 part 2) | `app/Support/Lists.php`, `ListController` |
| G-i12 | Local dev DB required a re-seed after adding centres (backfill ran, but tests use fresh DBs) | Not a bug — noted so it isn't a surprise | — |

### From Phase C — editable lists

| # | Issue | Impact | Where |
|---|---|---|---|
| C-i1 | `rating-chip.tsx` still has a hardcoded `TONES = { Good, Average, Poor }` colour map | A **new** progress grade added via `/admin/lists` validates correctly but renders with no tint | `resources/js/Components/rating-chip.tsx` |
| C-i2 | `Student::classLabelStatic()` still special-cases `5tahun`/`6bintang` in its `match` | Backend-rendered class labels (PDF receipts, memo audience) ignore an admin rename | `app/Models/Student.php` |
| C-i3 | CSV student import still normalises `'5'`/`'6'` to the class key | Importing a CSV for a newly-added class silently fails/skips the row | `app/Http/Controllers/Admin/StudentController.php` |
| C-i4 | The demo seeder writes raw literal values (`5tahun`, `O+`, `Good`, …) rather than list keys | If an admin renames a key, freshly-seeded demo data may not match | `database/seeders/DatabaseSeeder.php` |
| C-i5 | Migration columns still carry enum-ish defaults (`students.class` default `5tahun`, `progress_records` default `Select`) | A dropped/renamed list value can leave rows with a value no longer in any list | several migrations |
| C-i6 | `progress_grade` group is validated live but `ProgressRecord::PERMATA/FREE/DEVELOPMENT` are **not** manageable | Those three lists are still code-only | `app/Models/ProgressRecord.php` |
| C-i7 | `DailyActivity::FIELDS` (the 12 activity checkboxes) is not a manageable list | The 12 fields are fixed in the model and in the `daily_activities` columns | `app/Models/DailyActivity.php` |
| C-i8 | `PaymentController::MONTHS` is not a manageable list | Months are fixed English names; fine for now, but inconsistent with the new pattern | `app/Http/Controllers/Admin/PaymentController.php` |
| C-i9 | Emergency contact + collector `relationship` are still free text (not validated against the list) | Data can drift from the approved relationships — and the seeder already uses `Grandparent`/`Uncle` | `StudentContactController`, seeder |

### Progress log

_Append as each phase lands._

| Phase | Status |
|---|---|
| F — Delete safety | ✅ **done** (`9a407eb`) |
| A — Admin acts everywhere | ✅ **done** (`fdaa0c5`) |
| C — Editable lists | ✅ **done** (architecture + 14 lists + admin screen) |
| G — Two centres | next |
| C — Editable lists | not started |
| G — Two centres | not started |
| B — Settings + money | not started |
| E — Oversight views | not started |
| D — Admin accounts | not started |
