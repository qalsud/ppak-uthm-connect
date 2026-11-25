# UI/UX Review — PPAK UTHM Connect

*November 2026 · Admin desktop 1440×900 · Teacher and Parent mobile 390×844*

## How this was done

- Captured **76 screenshots** with headless Chrome: **46 admin** (desktop, including dialogs and
  tabs), **17 parent** (mobile), **13 teacher** (mobile).
- Used real CSS viewports — 390×844 for parent/teacher, not a shrunken desktop image.
- Opened create/edit dialogs and tabs without submitting forms, so no data was changed.
- Inspected the app shell, navigation, list, chat, attendance and progress components to identify
  root causes.
- Screenshots are stored **locally only** (they contain demo child/contact data):
  `C:\Users\HaiqalSuderman\AppData\Local\Temp\opencode\ui-review\index.html`
  Do not commit or share that folder publicly.

> The live demo contained UAT test records (including `<script>` strings). React escaped them
> correctly; no XSS executed. The screenshots show those records, which is why they should stay
> local.

---

## Executive summary

The visual foundation is strong: consistent navy/blue branding, clear cards, good typography,
role-specific bottom navigation, readable tables and well-designed check-in/checkout dialogs. This
is **not** a redesign job. The problems are concentrated in five areas:

1. **Teacher scope is dangerously permissive by default** (all classes / all centres).
2. **Monthly fee generation ignores the active centre** and gives no preview.
3. **The mobile shell wastes vertical space and sometimes names the wrong page** (duplicate titles,
   “Dashboard” on child detail, missing nav entry for admin teacher messages).
4. **Two shared pages break the app shell**: Profile uses the old Breeze layout for every role.
5. **Several controls don’t explain themselves**: progress ratings are unlabeled, attendance
   toggles look read-only, and mobile chat rows lose timestamps/unread badges.

The highest-impact fixes are small and local. The recommendations below are ordered by risk and
effort.

---

## P0 — fix before sharing the demo

### 1. A new teacher gets unrestricted access by default

**Evidence:** `admin/dialog-add-teacher.jpg`, `admin/03-teachers.jpg`, `teacher/01-dashboard.jpg`.

The Add Teacher form defaults **Class = “All classes”** and **no centre selected**, with the helper
“Leave empty for unrestricted access to every centre.” The teacher list then shows “All classes”
and an orange “All centres” warning. The seeded teacher sees students from both 5 Tahun and 6
Bintang.

**Why it matters:** any teacher created without an explicit class/centre can see, message, assess and
check out children outside their assignment. That is a data-scope leak, not just a UI issue.

**Fix:**

- Make **at least one centre mandatory** and **class mandatory** for a class teacher; add an explicit
  “Unrestricted (all classes / all centres)” permission flag for leads instead of treating *empty*
  as unrestricted.
- In the form, default both to “Select…” and show a red warning + confirmation only when the admin
  deliberately grants unrestricted access.
- Add a “Scope” column to the teacher list and a filter for “unassigned” teachers.
- Update `Student::visibleTo()` / `User::canManage()` semantics and add tests:
  - teacher with 5 Tahun cannot see 6 Bintang;
  - teacher with centre A cannot see centre B;
  - teacher with no scope sees nothing.
- Audit the seeded teachers (they currently have no scope).

### 2. Generate monthly fees ignores the active centre

**Evidence:** `admin/07-payments.jpg`, `admin/dialog-generate-fees.jpg`.

The dialog says “Create an unpaid fee record for every student for November…”, but the controller
loads `Student::active()` without `forActiveCentre()`. An admin viewing one centre can generate
fees for **every centre**. There is also no count/total preview.

**Fix:**

- Scope the generation to the **active centre** (or state “All centres” explicitly and require a
  separate confirmation).
- Show a preview: “X active students · Y already have November · Z will be created · estimated RM N”.
- Add a test that generating fees in centre A does not create records for centre B.

---

## P1 — high-impact UX

### 3. The mobile shell names the wrong page

**Evidence:** `parent/10-child-detail.jpg` (top bar says “Dashboard” while the page is the child’s
profile), `admin/24-teacher-messages.jpg` and `admin/teacher-thread.jpg` (top bar says “Dashboard”,
sidebar shows Dashboard active, but the page is Messages).

**Root cause:** `resources/js/Layouts/app-shell.tsx` computes
`heading = activeLabel ?? title ?? t('dashboard')`. `/parent/children/{id}` and
`/admin/register/messages` do not match a nav item, so both fall back to Dashboard. The admin
“Teacher views” children in `resources/js/lib/navigation.ts` also omit the messages route.

**Fix:**

- Add `{ label: 'messages', href: '/admin/register/messages', icon: MessageSquare }` to the admin
  Teacher views group.
- Pass a `title` per page (e.g. “Child profile”, “Messages”) or derive the heading from the page’s
  `h1`; never fall back to Dashboard for an unmatched route.
- Add a route-to-title test (or a small map) so new pages cannot silently inherit “Dashboard”.

### 4. Profile pages break the app shell

**Evidence:** `parent/11-profile.jpg`, `teacher/10-profile.jpg`, `admin/26-profile.jpg`.

`resources/js/Pages/Profile/Edit.tsx` still uses `AuthenticatedLayout` (Breeze). It shows a white
top bar with a placeholder logo/hamburger, no sidebar, no bottom navigation, and narrow fields in a
very wide card. Every role drops out of the product’s visual language here.

**Fix:**

- Move Profile into the role’s `AppShell` (nav + bottom nav).
- Use a two-column layout on desktop (profile + password/security) and stacked cards on mobile.
- Show the user’s role/centre and keep the same header, card and spacing tokens.

### 5. Mobile conversation rows lose timestamps and unread badges

**Evidence:** `parent/06-messages.jpg`, `teacher/07-messages.jpg` versus
`admin/24-teacher-messages.jpg`.

The admin teacher message list shows a timestamp and a red unread badge. The parent/teacher mobile
lists show only the child name and a long snippet; the timestamp/unread is missing or pushed out by
the snippet.

**Fix:**

- Ensure the parent/teacher conversation payload includes `last_date`, `last_time` and `unread`.
- Use a two-line row: name + **time** on the first line, snippet + **unread badge** on the second.
- Add `min-w-0` to the text column and `shrink-0` to the time/badge; test with long Malay names and
  long messages.
- Reuse the same `ConversationList` for all three roles.

### 6. Parent progress ratings are unlabeled

**Evidence:** `parent/04-activities.jpg`; code in
`resources/js/Components/parent/child-progress-card.tsx`.

The parent sees three chips: “Good”, “Good”, “Social Skills”. The first two are `activity_done` and
`child_proficiency`, with no labels; the third is a development area. The parent cannot tell which
rating means what.

**Fix:**

- Label each rating: **Activity performance**, **Skill mastery**, **Development area** (matching the
  teacher form).
- Use a compact 3-row table or labeled chips; show all five progress fields or clearly state which
  three are shown.
- Add a small legend (“Good / Average / Poor”).

### 7. Attendance data entry looks read-only

**Evidence:** `teacher/03-activities.jpg`, `admin/20-teacher-activities.jpg`.

The daily-activity form shows ten bordered cards with a label and a tiny “No” underneath. They look
like summary cards, not toggles. Teachers do this every day; the primary interaction is unclear and
slow.

**Fix:**

- Replace each card with a **Yes/No segmented control** or a switch with a colored selected state.
- Keep 44px+ targets and a visible focus ring.
- Add “Mark all No” / “Copy yesterday” and an optional “Clear”.
- In the parent view, use static check/cross rows so the read-only state is obvious.

### 8. Duplicate page titles waste mobile space

**Evidence:** `parent/06-messages.jpg` (top bar “Messages” + h1 “Messages” + card header
“Messages”), `parent/02-attendance.jpg` / `03-daily-update.jpg` / `05-financials.jpg` (top bar +
h1), every admin page (`04-students.jpg`, `07-payments.jpg`, …).

**Fix:**

- Choose one title per breakpoint. On mobile, the top bar can show the brand/context; the page `h1`
  is the title. Remove the duplicate `h1` where the top bar already names the page.
- In chat, remove the page `h1` and the list card header; the thread header is enough.
- On desktop, keep the top-bar title and drop the repeated `h1` (or use a breadcrumb).

### 9. Parent → Teachers lists every teacher, not the child’s teachers

**Evidence:** `parent/09-teachers.jpg`; `app/Http/Controllers/Parent/ContactController.php` returns
all active teachers.

The subtitle says “Contact your child’s teachers” but the page lists teachers from other classes and
centres.

**Fix:**

- Filter by the classes/centres of the parent’s children and group by child/class; or
- Relabel it “All teachers” and show each teacher’s class/centre, with a search field.

### 10. Scheduler health shows a false alarm on a fresh deploy

**Evidence:** `admin/17-settings.jpg` / `admin/full-settings.jpg`.

Both scheduled jobs show “Last run: Not run yet” and an amber “Not seen recently” badge, while the
scheduler is running. The page warns that cron may not be running.

**Fix:**

- Distinguish **“Not run yet”** (neutral) from **“Stale”** (amber) after the expected interval.
- Show the next scheduled run, or record a scheduler heartbeat when `schedule:work`/`schedule:run`
  starts.
- Do not show a warning before the first run.

### 11. Primary mobile actions can sit under the fixed bottom nav

**Evidence:** `parent/03-daily-update.jpg` (Submit update cut off at the bottom),
`teacher/03-activities.jpg` / `04-progress.jpg` (Save/next fields under the nav),
`parent/full-child-detail.jpg` (content under the nav).

**Fix:**

- Use a **sticky action bar above the bottom nav** for long forms:
  `bottom: calc(3.5rem + env(safe-area-inset-bottom))`.
- Ensure page bottom padding covers the nav + safe area; add
  `env(safe-area-inset-bottom)` for iPhone.
- Hide the bottom nav inside a chat thread so the composer gets the space.

### 12. Long names and labels truncate or overflow

**Evidence:** `parent/01-dashboard.jpg` (“Muhammad Adam bin Ahmad …”), `parent/03-daily-update.jpg`
(child tabs cut off), `parent/06-messages.jpg` (snippet reaches the edge).

**Fix:**

- Allow two-line wrapping for child names, or show a shorter display name (first + last) with the
  class below.
- Replace the horizontal child pill selector with a dropdown or scrollable chips with a visible
  scroll affordance.
- Use `min-w-0` + `truncate` on the correct flex child; test with long Malay names.

---

## P2 — polish and additions

### Parent

- **Allergies when empty:** `StudentProfileCard` hides empty rows. Show **“No known allergies”** and
  “No dietary restrictions” explicitly; safety-critical information should never look absent.
- **Child detail length:** four large empty cards (“History”, “Daily updates”, “Daily activities”,
  “Progress”) plus identity/medical create a very long scroll. Use tabs/accordions
  (**Overview / Health / Progress / Attendance**) and compact empty states.
- **Date formats:** ISO (`2026-11-24`) in activities/progress vs `Wed, 25 Nov 2026` elsewhere.
  Standardize (`EEE, d MMM yyyy` for headings, `d MMM` for compact rows).
- **“Updated by the teacher”** repeated on every card; replace with “As of 08:05” or the last update
  time.
- **Notifications popover** opens at the left edge, covers the date and has no close button. Use a
  full-width bottom sheet on mobile with a close affordance and a clearer empty state.
- **Financials:** the outstanding amount wraps (“RM” / “620.00”); “Overdue” + “Unpaid” chips are
  redundant; make month rows tappable and show a human due date. If Stripe is unavailable, say so
  instead of letting the parent tap a dead “Pay” button.
- **Memos:** add audience/class/centre tag, unread state, and search/filter; memos currently look
  identical regardless of target.
- **Absence form:** add a summary (“2 days · 27–28 Nov”), the max-days hint, and clearer proof
  guidance; the form itself is otherwise clear.

### Teacher

- **Two unread counters side by side** (messages bubble + notification bell) with identical red
  badges look like duplicate bells. Differentiate the icon/badge color or combine them into one
  inbox on mobile.
- **Dashboard stat labels truncate** (“Daily activ…”, “Daily upd…”). Use shorter labels
  (“Activities”, “Updates”) or allow wrapping.
- **Duplicate class filters** on the dashboard (pills + select). Keep one.
- **Attendance page** is long: stats, absences, then register. Make the register the primary content,
  collapse stats, and add a “jump to register” affordance.
- **Daily updates** mixes parent-update cards with attendance actions; clarify the purpose or link to
  attendance.
- **Approve/decline absence** are immediate primary actions with no confirmation; add confirmation
  and show the child’s class/centre.
- **Check-in/checkout dialogs** are strong. Add “A photo is required unless you use the override” and
  explain why the Confirm button is disabled.
- **Teacher list scope chips** (“All classes”, orange “All centres”) should link directly to
  edit-scope.

### Admin

- **Duplicate titles** on every page (top bar + h1); pick one.
- **Filter duplication:** top-bar centre switcher + page centre filter; class pills + class/status
  selects. Make one the context and one the filter, with labels.
- **Lists:** the admin sees a technical value/slug (`5tahun`) and an unlabeled `0` field. Auto-slug
  from the label, label the sort field, hide internals under “Advanced”.
- **Memo create:** with “All centres” active, the dialog does not show which centre the memo will
  belong to. Show the target centre or require a choice.
- **Add Parent:** no child linkage. Add a children multi-select or a clear “create → link child”
  follow-up.
- **Add Student:** class defaults to the first class, and medical/allergy fields are absent. Require
  a class selection; capture allergies/medical at enrolment or prompt immediately after.
- **Add Payment / Generate fees:** show the computed amount / record count and require confirmation.
  “Mark paid/unpaid” in the table also needs a confirmation and an undo toast.
- **Fee settings:** “Save” vs “Save as a new version” is ambiguous; rename (“Update current rate” /
  “Create new version”) and guard deleting the active rate.
- **Transactions:** show “Stripe not configured” (or test mode) instead of only “No online payments
  yet”.
- **Student detail:** the Alerts/Allergies banner should include the actual allergens
  (“Dust, pollen”), not just the word “Allergies”.
- **Activity log:** all action chips share the same blue tint; color-code create/update/delete.
- **Teacher messages vs Conversations:** the admin has two chat UIs; add the missing “Teacher views →
  Messages” nav entry and explain the difference (act as teacher vs oversight).
- **Support** is a `mailto:` link; label it “Email support” or give it a page.

### Cross-cutting

- **Global search is absent on mobile** for teacher/parent. Add a search icon that opens a
  full-screen search sheet.
- **Touch targets:** month checkboxes, tiny delete icons and some text links are below 44px. Increase
  hit areas.
- **Helper text:** several 10–11px muted labels are hard to read; use 12px+ and stronger contrast.
- **Loading/reconnect states:** add skeletons for slow pages and a subtle “Reconnecting…” banner when
  Reverb drops (the app falls back to polling, but the user cannot tell).
- **Empty states:** “No records found” is repeated. Use specific copy (“No attendance yet today”,
  “No medication requests this month”) and a single compact block.

---

## What works well — keep it

- Admin desktop shell: navy sidebar, active state, top-bar centre switcher, search, clear tables.
- Role-specific mobile bottom nav (Dashboard / Attendance / Update / Financials / Messages).
- Parent child cards with attendance status, temperature and quick actions.
- The “Report an absence” card and the check-in/checkout dialogs — clear, focused, well-sized.
- Chat bubbles, day separators, read receipts and the two-column admin chat.
- Semantic status chips (green paid, amber pending, red overdue, rose absent).
- Memo cards, fee example card and admin create dialogs.
- Bilingual EN/BM coverage and accessible names on icon buttons.

---

## Suggested implementation order

**Sprint 1 — safety and shell**

1. Teacher scope model + tests; fix the Add Teacher defaults; audit seeded teachers.
2. Scope monthly-fee generation to the active centre + preview/confirm.
3. Fix shell titles/nav (`navigation.ts`, `app-shell.tsx`); add the admin messages nav item.
4. Move Profile into `AppShell` for all roles.
5. Mobile sticky action bars / bottom-nav/safe-area padding.
6. Conversation-list timestamps/unread + long-name overflow.

**Sprint 2 — daily usability**

7. Label progress ratings.
8. Replace attendance cards with real Yes/No controls + “Mark all No” / “Copy yesterday”.
9. Remove duplicate titles and redundant chat headers.
10. Parent teachers scope; scheduler “not run yet” state.
11. Allergy empty states; child-detail tabs/compact empty states.
12. Financials, memos and payment confirmations.

**Sprint 3 — polish**

13. Lists admin value/slug UX; memo centre; Add Parent child link; payment/generate previews.
14. Stripe status; activity-log colors; mobile global search.
15. Date formats, helper-text size, touch targets, loading/reconnect states.
16. UAT/test-data cleanup before the supervisor demo.

---

## Screenshot index (local only)

| Role | Count | Key evidence |
|---|---|---|
| Admin desktop | 46 | `01-dashboard`, `04-students`, `05-student-detail`, `07-payments`, `17-settings`, `24-teacher-messages`, `full-settings`, `dialog-add-teacher`, `dialog-generate-fees` |
| Parent mobile | 17 | `01-dashboard`, `02-attendance`, `03-daily-update`, `04-activities`, `05-financials`, `06-messages`, `10-child-detail`, `full-child-detail`, `dialog-absence`, `dialog-medication` |
| Teacher mobile | 13 | `01-dashboard`, `02-attendance`, `03-activities`, `04-progress`, `05-growth`, `07-messages`, `dialog-check-in`, `dialog-checkout` |

Gallery:

```
C:\Users\HaiqalSuderman\AppData\Local\Temp\opencode\ui-review\index.html
```

> Do not commit the screenshot folder: it contains demo children’s names, parent/teacher contact
> details and UAT records. Keep it local; share only selected, redacted images.
