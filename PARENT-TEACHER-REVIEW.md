# Parent ↔ Teacher Functional Review

> **Status: historical audit (kept for reference).** Most P1/P2 items below were fixed in the
> rebuild, and the attendance/progress modules have since been overhauled. For the current feature
> set see [`README.md`](README.md); for the admin area see [`ADMIN-REVIEW.md`](ADMIN-REVIEW.md); for
> photos see [`CHECKOUT-PHOTOS-PLAN.md`](CHECKOUT-PHOTOS-PLAN.md); for the competitive view see
> [`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md).
>
> **30 Sep 2026:** the admin plan (settings + per-centre fees, oversight views, admin accounts, two
> centres, absence requests) and a full UI/i18n sweep are complete — see
> [`ADMIN-CONTROL-PLAN.md`](ADMIN-CONTROL-PLAN.md) and [`HANDOFF.md`](HANDOFF.md).

Deep review of every parent/teacher flow (controllers, models, migrations, routes, UI).
Scope: daily updates, daily activities, progress, payments, messaging, notifications, data integrity.

Legend: **P1** = fix now (correctness/security), **P2** = important improvement, **P3** = nice-to-have / polish.

---

## 1. Bugs & correctness (P1)

### 1.1 💸 Payment marks MORE records paid than were actually paid
`app/Services/Payments/PaymentCompletionService.php::complete()`
- It marks **all currently-unpaid** financial records for the student as paid — not just the ones included when the checkout session was created.
- **Impact:** if an admin adds a new month's fee between the parent starting checkout and the webhook firing, that new fee is silently marked **Paid without payment**. Real money loss.
- **Fix:** snapshot the covered record IDs on the `Payment` at checkout (e.g. `financial_record_ids` JSON column); on completion mark only those IDs. Also mark `ReceiptGenerated = true`.

### 1.2 💸 Receipt / success page list the wrong records
`app/Http/Controllers/Parent/PaymentController.php::success()/receipt()`
- Both fetch **every paid record** for the student, so a receipt can show months that were paid in *earlier* transactions (or by the admin), inflating the total vs the amount charged.
- **Fix:** list only the records covered by *this* payment (same snapshot as 1.1).

### 1.3 🔔 Message notification deep-link is inverted (both directions)
`app/Notifications/MessageReceivedNotification.php::url()`
```php
return student->parent_id === sender->id
    ? route('parent.messages.index')   // sender = parent → recipient = TEACHER
    : route('teacher.messages.index'); // sender = teacher → recipient = PARENT
```
- When a **parent** sends, the **teacher** receives a notification linking to `/parent/messages` → role-guarded → **403**.
- When a **teacher** sends, the **parent** gets a link to `/teacher/messages` → **403**.
- **Fix:** link to the *recipient's* route (`parent.messages.index` for parents, `teacher.messages.index` for teachers).

### 1.4 💬 Parents cannot start a conversation
`app/Http/Controllers/Parent/MessageController.php` + `resources/js/Pages/Parent/Messages.tsx`
- A conversation only exists once a **teacher** opens one (`teacher.messages.open`). Until then a parent sees "No conversations yet." and **cannot message anyone**.
- There is **no `parent.messages.open` route**.
- Also, a parent message notifies `conversation->teacher_id` **only if set** — which it isn't for parent-first threads.
- **Fix:** add `parent.messages.open` (per child) that creates the conversation (`teacher_id = null`) and notifies **all active teachers**; add a "New" button for parents like teachers have.

### 1.5 🔔 Teachers are never notified of memos
`app/Http/Controllers/Admin/MemoController.php::store()`
- Memo notifications go to **active parents only**. The requirement is memos/announcements to **parents *and* teachers**.
- **Fix:** also `Notification::send($activeTeachers, new MemoPostedNotification(...))`.

### 1.6 🔔 Teachers are never notified when a parent submits a daily update
`app/Http/Controllers/Parent/DailyUpdateController.php::store()`
- No notification is created. Teachers only discover it by refreshing the Daily-updates page.
- **Fix:** notify all active teachers (or the class teacher) on submit.

### 1.7 📅 Future-dated records allowed from the parent side
- `Parent\DailyUpdateController::store()` → `date => required|date` (no upper bound). Teacher activity store has `before_or_equal:today` but **teacher progress store does not**.
- **Impact:** parents/teachers can post updates/progress for future dates, polluting "today" dashboards.
- **Fix:** add `before_or_equal:today` to parent daily-update and teacher progress.

### 1.8 🧹 Orphaned pending payments on Stripe failure
`Parent\PaymentController::checkout()`
- A `Payment` row is created **before** the Stripe call; if the call throws, the pending row (no session) remains forever.
- **Fix:** delete the row in the `catch`, or create it after the session is created.

---

## 2. Data integrity (P1/P2)

| Table | Problem | Fix |
|---|---|---|
| `daily_activities` | only a non-unique `index(student_id,date)` — duplicate rows possible under concurrency | add `unique(student_id, date)` |
| `daily_updates` | same (no unique) | add `unique(student_id, date)` |
| `financial_records` | duplicate `student_id + month` guarded only by a PHP `exists()` check (race) | add `unique(student_id, month)` |
| `progress_records` | already `unique(student_id, date)` ✅ | — |

Controllers already do "find by student+date, else create" (`whereDate`), so adding the unique indexes is safe and closes the race.

---

## 3. Notifications matrix (current vs desired)

| Event | Parent | Teacher | Notes |
|---|---|---|---|
| Admin adds fee record | ✅ | — | n/a |
| Payment completed | ✅ | — | consider notifying admin too (P3) |
| Teacher records activity | ✅ | — | |
| Teacher records progress | ✅ | — | |
| Parent submits daily update | ❌ **1.6** | ❌ | teachers should get it |
| Admin posts memo | ✅ | ❌ **1.5** | teachers should get it |
| New chat message | ✅ (inverted link **1.3**) | ✅ | fix deep-links |

Also: notification **worker/queue** — notifications are sent **synchronously** inside the request (`BaseNotification` no longer queues). Fine at this scale; consider queue later (P3).

---

## 4. Messaging — deeper notes

- **One conversation per child** (`unique(student_id)`), shared across all teachers; `teacher_id` is just "first teacher to open". This is acceptable but means the parent isn't talking to one named teacher — document/decide if intended (P2).
- **Any teacher can read/reply** to any conversation (no teacher↔class mapping). Fine for a small centre; flag if teacher scoping is required (P2).
- **Unread counts are N+1**: each conversation runs its own `count()` query in `list()` (both parent & teacher). Use `withCount(['messages as unread_count' => ...])` (P2, perf).
- Messages have `read_at` but no typing/receipt UI; not required.
- No message pagination **— resolved**, see [`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md) — `open.messages` loads the whole thread (P3).
- Bell shows *notifications*, not unread **messages**; the Messages tab has no unread badge (P2 UX).

---

## 5. Missing features vs the original requirements (P2)

These existed in the legacy system / the paper but aren't in the rebuild:

1. **Parent → Teacher contact / profiles** — legacy had `parent/contact.php` (view teacher profiles & contact). No route/page now. Add a read-only "Teachers" page for parents.
2. **History / timeline** — parents see only the **latest** activity and **latest** progress; teachers see only the **latest** daily update per child. No way to look back over days/weeks.
   - Add per-child history (date list) for parents (activity + progress) and for teachers (daily updates).
3. ~~**Attendance** — only a parent-declared `arrival_time`. No teacher-side attendance / pickup log.~~ **(Resolved — see the attendance module: daily arrive/depart log with parent + teacher control.)**
4. **Health records** — only a free-text `health_status`; no structured medical/immunisation records.
5. **Reports/exports** — none (the admin "Export CSV" buttons are UI-only placeholders).

---

## 6. UX / consistency (P2/P3)

1. **Daily-update prefill is stale** — the parent form pre-fills arrival/sleep/bath/health from the **latest update of any date** while the date defaults to **today**. A parent may unknowingly submit last week's values. Only prefill when the latest update is **today** (P2).
2. **"Select" grades can be saved** — teacher progress allows `activity_done`, proficiency, PERMATA, free, development to be the placeholder `"Select"`, which then shows as a real value. Require a non-"Select" choice (P2).
3. **Teacher Activities list is global** — `index()` lists the last 30 records across **all teachers** and ignores its own `$today` variable. Filter by the current teacher and/or the chosen date (P2).
4. **Inconsistent age validation** — parent register allows 3–10; admin student create allows 2–12. Align (P3).
5. **No empty-state for some lists** — most are covered; verify Payments/Registrations on mobile (done).
6. **Unread messages badge** missing on the Messages tab (see §4).
7. **Class label consistency** — some places show `5tahun` raw (e.g. select options in teacher activities) instead of "5 Tahun"/"6 Bintang". Use `classLabel` (P3).

---

## 7. Performance (P2/P3)

- `Teacher\DailyUpdateController::index()` loads **all** daily updates for the class (unbounded) to pick the latest per student. Replace with a per-student `latestOfMany`/window query or `whereDate('date', today())` for the "today" view (P2).
- Message unread counts N+1 (see §4).
- `Parent\DashboardController` unread count loops conversations (N+1) — use a single aggregate query (P3).
- `Parent\ActivityController` / dashboard do 2–3 queries per child — fine for small numbers; use eager loads if scaling (P3).

---

## 8. Security / authorization — reviewed ✅

- Parent ownership enforced on daily-update store, message show/store, payment checkout/success/receipt (403 for other parents' children).
- Additional checks **to add**: parent daily-update `store` should also verify the target student belongs to the parent **before** validating `date` semantics (already checks ownership ✅).
- Stripe webhook signature verified; CSRF-exempt correctly.
- Payment amounts computed server-side ✅ (no client-chosen amounts).
- No mass-assignment issues (validated arrays only).

---

## 9. Recommended fix order

**Do first (P1):**
1. Payment coverage snapshot (1.1 + 1.2)
2. Message notification deep-links (1.3)
3. Parent-initiated conversations (1.4)
4. Notify teachers on memo (1.5) and daily update (1.6)
5. Date bounds on parent daily-update + teacher progress (1.7)
6. Unique indexes on daily_activities / daily_updates / financial_records (§2)
7. Clean up orphan payments (1.8)

**Then (P2):**
- Unread badge + N+1 fixes; progress "Select" validation; teacher activities filtering; daily-update prefill; teacher history view; parent history view; parent "Teachers/Contact" page; align age validation.

**Later (P3):**
- ~~Attendance module~~ — **done**: per-child daily drop-off/pick-up. **Attendance is teacher-only**
  (parents are read-only): teachers mark "At school" on the register (`/teacher/attendance`) and
  **check out with a photo** at `/teacher/attendance` (see `CHECKOUT-PHOTOS-PLAN.md`). Migration
  `attendance` + `attendance_photos`, model `App\Models\Attendance`, controller
  `Teacher\AttendanceController`. Includes **attendance history** (parent `/parent/attendance` + child
  page) and a class/date register.
- **Done since:** CSV export (students/teachers/parents), **notify admin on completed payments**,
  class-label consistency, audit log, pagination.
- **Still open:** queued notifications, staff attendance/scheduling.

---

## Progress module overhaul (later pass)

The progress module was confusing: six flat selects with no grouping, misleading names (`activity_done` labelled "Activity performance" but a grade; `development_proficiency` an area, not a proficiency), **validation errors on the selects were never displayed** (saving silently appeared to do nothing), the history hid 5 of 8 fields, and there was no way to view one child's progress.

**Done:**
- Grouped the form into **Lesson / Activities today / Assessment** sections, each field with helper text and a **rating guide** (Good/Average/Poor chips).
- Fixed the silent-failure bug — **all field errors render**; Save is **disabled until a student + date** is chosen; the `Select` sentinel was replaced with real placeholders.
- **Progress history** now has **student + class filters**, a **per-student summary** (record count, last recorded, latest assessment) and full record cards (both ratings + development area as chips, PERMATA/free activity, notes, teacher).
- Parent side (`/parent/activities` + the child page) now shows the same **clear labels and rating chips**, incl. notes.
- New `RatingChip` component; ~25 new bilingual keys.

---

## Health & safety + growth (later pass — 29 Sep 2026)

Added after the audit above, so any overlapping "still open" notes here are superseded:

- **Check-in health** — teachers can capture an optional **temperature + health note** when marking a
  child arrived; ≥ 37.5 °C is flagged **"Elevated"**. Parents see the reading in their attendance history.
- **Allergies / medical notes** — on the child profile (admin-editable) and flagged as a red warning in
  the teacher's attendance register.
- **Medication requests** — parent requests (date, medicine, dosage, time, notes) → teacher logs
  **given / declined** with the staff member, time and note; the parent is notified (bell + email if opted in).
- **Growth tracking** — teacher records height/weight per child/day (BMI auto-calculated; same-day
  re-entry updates) plus a **class average BMI**; parents get tiles + a trend list on the child page.
- **Fee reminders** — `fees:send-reminders` runs **daily at 08:00** for fees due within 3 days or overdue.

Superseded above: §5.4 (health records) is **partly resolved** — allergies, medical notes, temperature and
medication are structured now; immunisation records are still open.

**Still open from this audit:** structured immunisation records, reports/exports beyond CSV (activity
log CSV ✅, term progress-report PDF still open), queued notifications, staff attendance/scheduling.
**Shipped since:** absence requests, parent "Teachers" contact page, per-centre fees, oversight views.

---

*Generated from a full read of `app/Http/Controllers/{Parent,Teacher}`, `app/Models`, `database/migrations`, `routes/web.php`, `app/Notifications`, `app/Services/Payments`, and the shared React components. Health/safety + growth section added 29 Sep 2026.*
