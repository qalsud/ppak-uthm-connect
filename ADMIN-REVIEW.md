# Admin Site Review & Improvements

A full sweep of the admin area (`/admin`) focused on making it intuitive, safe, and consistent with the parent/teacher portals. Everything below is implemented and covered by tests unless noted under **Still open**.

---

## What was broken or rough

| # | Issue | Where |
|---|---|---|
| 1 | Literal placeholder copy `"A sub copy here"` shipped in the UI | Dashboard |
| 2 | Pending-registrations badge looked clickable but wasn't | Dashboard |
| 3 | "Add student" quick action opened the list, not the form | Dashboard |
| 4 | Monthly income chart had no amounts/tooltips | Dashboard |
| 5 | Hardcoded English (not localised) labels | Dashboard, all pages |
| 6 | Student **Parent ID** was a raw number text box (you had to know the id) | Students |
| 7 | No class filter; count of results unclear | Students |
| 8 | CSV import tab was a disabled "coming soon" placeholder | Students, Teachers |
| 9 | `parent_id` validated only `exists:users,id` — a **teacher id was accepted** as a parent | Students |
| 10 | Age input allowed 2–12 but the server enforced 3–10 | Students |
| 11 | No status filter; deletes used the native `confirm()` popup | Teachers |
| 12 | Admin could not reset a teacher's password | Teachers |
| 13 | Payment **Student ID** was a raw number text box | Payments |
| 14 | No paid/unpaid filter; no fee totals; `paid_on` hidden; one record at a time only | Payments |
| 15 | Approve/reject list showed **only pending** users — no way to see active/rejected accounts | Registrations |
| 16 | Native `confirm()` popups everywhere (inconsistent, unstylesable) | Students/Teachers/Payments/Memos |
| 17 | Memos truncated at 4 lines with no way to expand | Memos |
| 18 | Fee page gave no feedback about what the numbers mean | Fees |

## What changed

**Dashboard**
- Removed the placeholder; real localised subtitle + chart caption.
- Pending badge is now a **link to Registrations**.
- "Add student" opens the create dialog directly (`/admin/students?create=1`).
- Chart bars show the amount on hover.
- All labels localised (EN/BM).

**Students**
- **Parent dropdown** (name · email) replaces the raw ID box, incl. "Unassigned".
- **Class filter** + live `shown/total` count.
- **Real CSV import** (columns: `name, age, class, parent_email`) with a downloadable template; links parents by email; skips blank/invalid rows.
- `parent_id` now validated to be an actual **parent** account.
- Age aligned to 3–10.
- Delete uses a proper **ConfirmDialog**.

**Teachers**
- **Real CSV import** (columns: `name, email, ic_number, phone, password`) with template; defaults password to `password123` when omitted.
- **Status filter** (Pending / Active / Awaiting / Rejected) with per-status counts.
- **Password reset** when editing (leave blank to keep).
- ConfirmDialog for delete; localised.

**Payments**
- **Student dropdown** (name · class) replaces the raw ID box.
- **Paid/Unpaid filter** (plus existing month + class filters).
- **Summary cards**: collected this month, total outstanding, unpaid-record count.
- `Paid on` column; localised Paid/Unpaid/Mark paid buttons.
- **Generate monthly fees** — one click creates an unpaid record for every student for a chosen month, skipping those who already have one (and notifies parents). No more adding records one-by-one.
- ConfirmDialog for delete.

**Registrations** → now a proper **user manager**
- **Pending / Active / Rejected / All tabs** with live counts.
- **Role filter** (All / Parent / Teacher) + **debounced search** by name/email.
- Status badges + formatted dates; approve/reject only on pending rows.

**Memos**
- "View more / view less" expansion for long announcements.
- ConfirmDialog; localised empty states.

**Fees**
- Live **example calculation** (monthly fee + 2h overtime) and a "last updated" line.

**Parents (new page)**
- Full parent management at `/admin/parents` (added to the admin sidebar):
  - List with **children count** (child names on hover) and each child listed on mobile
  - Status filter + per-status counts, search by name/email
  - **Create / edit** parents (incl. **password reset**) and **delete** them — children are kept, only the parent link is cleared
  - CSV export

**Payments — receipts**
- Admins can now **download a PDF receipt** for any paid fee record (new single-record receipt template that works for both Stripe-paid and manually-marked records; sets the `ReceiptGenerated` flag).

**Shared**
- New `ConfirmDialog` (replaces every native `confirm()`).
- New `CsvImportDialog` (file picker + template download + errors).
- ~60 new bilingual i18n keys.

---

## Backlog — completed this session

- **Pagination + server-side search** on Students, Teachers, Parents, Payments and Registrations (shared `Pagination` component; searching after pagination now searches the whole set, not just the page).
- **CSV import reporting** — imports return an `import_report` flash; a dismissible panel shows the imported count and a **per-row reason** for every skipped line (missing name, invalid class, missing/duplicate email).
- **Audit log** — new `activity_logs` table + `/admin/activity` page (search + pagination). Records who changed what across users/teachers/students/parents, memos, fees, payments, and teacher attendance/progress.
- **Memos** — **editing** + **audience targeting** (Everyone / Parents / Teachers / a specific class), with notification + visibility filtered per portal.
- **Admin notifications** — admins are notified (bell) of new registrations and completed online payments.
- **Admin student detail page** — `/admin/students/{id}` shows attendance (with checkout photos), progress (with photos), daily updates, activities and payments.
- **Bulk actions** — multi-select delete for Students/Teachers and bulk approve/reject for Registrations.

## Still open (backlog)

- **Email/SMS notifications** — everything is in-app (database + broadcast); add mail/SMS channels.
- **Further audit coverage** — logins, exports and profile changes aren't logged yet.
- **Admin attendance register** — admins can view a child's attendance but not a whole-class register.

---

*Verified with the browser on all admin pages (no console errors) and 104 Pest tests / 491 assertions.*
