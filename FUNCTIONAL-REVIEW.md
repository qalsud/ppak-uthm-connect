# Functional Review — what to improve, module by module

A flow-by-flow look at **functionality** (not styling): where the current behaviour is thin, what's
missing, and what to add. Priorities: **P1** = correctness/safety or daily friction · **P2** = clear
value · **P3** = nice-to-have.

> Companion docs: [`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md) (market view) ·
> [`ADMIN-REVIEW.md`](ADMIN-REVIEW.md) · [`PARENT-TEACHER-REVIEW.md`](PARENT-TEACHER-REVIEW.md).

---

## Progress (updated 29 Sep 2026)

**✅ Done in this pass**

| Item | What shipped |
|---|---|
| **F1 Email** | Notifications now carry a **mail channel** (+ `toMail()`); **approve/reject emails** to applicants; **rejection reasons** captured and shown. *(Set a real `MAIL_MAILER` for production.)* |
| **F2 Archive** | Students have **active / withdrawn / graduated** status with **restore**; hard delete is blocked while enrolled and **never cascade-deletes history**; all lists scope to active. |
| **F3 Teacher–class** | Teachers are **assigned a class** (admin UI) and can only **view/manage their class** (attendance, activities, progress, updates, messages). |
| **Global search** | The dead header box is now a **real role-aware search** (students/teachers/parents/memos). |
| **Bulk attendance** | **"Mark all present"** for a class in one tap. |
| **Arrival notifications** | Parents are notified **on check-in** as well as check-out (once per child/day). |
| **Fees** | **Due dates** on fee records, **overdue** flags, and parents can **pay only the months they choose**. |
| **Auth/registrations** | Decision emails + reasons (above). |

**✅ Health & safety + growth pass (29 Sep 2026)**

| Item | What shipped |
|---|---|
| **Check-in health** | Optional **temperature (°C)** + **health note** when a teacher marks a child arrived; the status chip turns amber with an "Elevated" tag at ≥ 37.5 °C; parents see the reading in their attendance history. |
| **Allergies / medical notes** | On the child profile (admin-editable) and shown as a **red warning in the teacher's attendance register**. |
| **Medication requests** | Parent requests (date, medicine, dosage, time, notes) → teacher logs **given / declined** with staff, time and note; the parent is notified. The day's requests appear as a card on the attendance register. |
| **Growth tracking** | Teacher records **height/weight → BMI** (same-day re-entry updates rather than duplicates), **class average BMI**, latest-per-child and full history tables; parents get tiles + a trend list on the child page. |
| **Fee reminders** | `fees:send-reminders` scheduled **daily 08:00** — one notification per family for fees due within 3 days or overdue. |

**✅ Admin plan + settings/oversight pass (30 Sep 2026)** — the whole `ADMIN-CONTROL-PLAN.md`

| Item | What shipped |
|---|---|
| **Guardians (F4)** | Per-child **guardians** (mother + father, relationship, primary, can-collect), **emergency contacts** and **authorised collectors** with IC/photo. |
| **Two centres (F6)** | `centres` + a header **switcher**; **`class` is centre-scoped** everywhere; per-centre dashboards, memos and **fee rates**. |
| **Absence requests** | Parent files an absence (with optional proof) → teacher **approves/declines**; it syncs into attendance. |
| **Settings + money** | **`/admin/settings`** (operational rules) with `setting('x', config('y'))`; **versioned per-centre fee rates**; **editable fee records**; **Stripe refunds** (`/admin/transactions`). |
| **Admin accounts** | `/admin/administrators` (create/edit/deactivate/delete) with last-admin guards. |
| **Editable lists** | One `list_options` source of truth (classes, relationships, progress options, daily-activity fields, …) for backend **and** frontend. |
| **Oversight** | Student detail gained **absences / medication / growth**; **activity-log filters + CSV**; **conversation** reply/reassign/close; dashboard **year + month-over-month + actionable tiles**. |
| **i18n + UX** | Full bilingual coverage (incl. **auth/profile**); admin sidebar **"Teacher views"** group; misc UI fixes. |

**⏳ Still open** (next passes): academic **terms (F5)** · bulk class activities/progress · student
**photo/IC** + class-move history + CSV upsert/dry-run · memo attachments/scheduling/read receipts ·
**term progress-report PDF** + monthly statements · growth **chart** (data ✅) · reports/analytics ·
backups · PWA/push · queueing notifications · audit coverage (logins/exports) · accessibility pass.

---

## 0. Structural foundations (fix these first — they affect every module)

| # | Gap | Why it matters | Suggested |
|---|---|---|---|
| F1 | 🔴 **Emails never send** (`MAIL_MAILER=log`) | Account approval, password resets, fee reminders, registration confirmations — none reach anyone. Blocks production. | Configure a real mailer (SMTP/API), add notification `mail` channel + queued sends. |
| F2 | 🔴 **Deleting a child destroys history** (9 tables `cascadeOnDelete`) | Attendance, progress, photos, payments vanish with the child — no audit trail, irreversible. | **Soft-delete / "withdrawn" status** instead of hard delete; only purge on explicit request. |
| F3 | 🔴 **Teachers aren't scoped to a class** (no `teacher ↔ class` link) | Any teacher can mark attendance, progress and activities for **any** child in any class. | Add **class assignment** to users; scope teacher queries + authorize actions to their class. |
| F4 | 🟠 **One guardian per child** (`students.parent_id`) | No mother **and** father, no guardian relationship type, no emergency contact. | `student_guardians` pivot (user, relationship, primary/emergency). |
| F5 | 🟠 **No academic term / year** | Records accumulate with no way to scope "Term 1 2026" reports or roll over. | `terms` (name, start, end) + `term_id` on progress/payments; a "current term" setting. |
| F6 | 🟠 **Two centres not modelled** | Taska Hikmah UTHM and Tadika Khalifah Junior share one flat dataset (`class` = 5tahun/6bintang only). | `centres` table + `centre_id` on students/users; per-centre dashboards. |

---

## 1. Auth / registration / approval

**Flow today:** parent self-registers → `pending` → admin approves → `active` (+ email pre-verified).

| Gap | Priority | Suggested |
|---|---|---|
| No email on approval/rejection — applicants must guess | P1 | Send a decision email (approve/reject) once mail (F1) works. |
| Rejection has no reason captured | P2 | Add optional `rejection_reason`, include it in the email, show it in Registrations. |
| Only parents can self-register | P2 | Optional teacher **invite** link (token) so staff can self-onboard, still admin-approved. |
| No admin 2FA | P2 | TOTP for admin accounts. |
| Pending users have no self-service (resend/reset) | P3 | Actions from the Registrations row. |

---

## 2. Admin dashboard

**Flow today:** KPI cards, income bar chart, class donut, recent payments.

| Gap | Priority | Suggested |
|---|---|---|
| Static — no date range, no month-over-month | P2 | Date-range picker; compare vs previous period; "unpaid this month" and "not checked in today" **actionable** widgets with links. |
| Chart built from a legacy `Month` field | P2 | Aggregate from `paid_on` properly; make the chart source explicit. |
| No exports | P3 | Export dashboard summary to PDF/CSV. |

---

## 3. Registrations

| Gap | Priority | Suggested |
|---|---|---|
| Active/rejected rows have no actions | P2 | Re-activate / re-reject from the same table. |
| No search by phone/IC | P3 | Extend search fields. |
| Bulk approve/reject ✅ done | — | — |

---

## 4. Students

| Gap | Priority | Suggested |
|---|---|---|
| No archive/withdraw status (F2) | P1 | `status = active/withdrawn/graduated`, filter in list, keep all history. |
| No child photo / IC (medical notes + allergies ✅ done) | P2 | Add photo/IC fields; show on the detail page. |
| No class-move history | P2 | `student_class_history` (from → to, date). |
| CSV import only creates (no update/dry-run) | P2 | Upsert mode keyed on a column; preview + confirm before writing. |
| Detail page is read-only | P2 | Inline edit + quick actions (record attendance, add payment) from the detail page. |
| No siblings link | P3 | Group by guardian/household. |

---

## 5. Teachers

| Gap | Priority | Suggested |
|---|---|---|
| No class/centre assignment (F3) | P1 | `class` (and `centre`) on the teacher; drives scoping. |
| No role (lead vs assistant) | P3 | `staff_role` enum. |
| No staff attendance/leave | P3 | Reuse the attendance model for staff. |

---

## 6. Parents

| Gap | Priority | Suggested |
|---|---|---|
| Only one parent account per child (F4) | P1 | Guardians pivot (above). |
| Parents can't maintain their own/child details | P2 | Editable profile + "child info" (address, emergency contact) with admin approval. |
| No notification preferences | P3 | Per-channel toggles (fee, updates, messages). |

---

## 7. Payments & fees

**Flow today:** admin generates monthly records from one global fee, or adds overtime manually;
parent pays the **total unpaid** via Stripe; admin downloads a per-record PDF receipt.

| Gap | Priority | Suggested |
|---|---|---|
| ~~**Parent can't choose which month to pay**~~ ✅ done | — | Parents now select the months to settle. |
| One global fee for everyone | P2 | Per-class / per-child fee overrides; registration fee; discounts (sibling, staff); subsidies. |
| ~~No fee reminders~~ ✅ done | — | `fees:send-reminders` daily 08:00 (needs the scheduler running). |
| ~~No due dates / overdue concept~~ ✅ done | — | `due_on` on records; "overdue" badge + filter. |
| No payment method/notes on mark-paid | P2 | Record method (cash/transfer/online) + reference; show on receipt. |
| No invoice (only receipts) | P2 | Invoice PDF + invoice numbers; monthly **statement** per child. |
| No refund/void (delete loses history) | P2 | Void with reason + audit entry. |
| No autopay/installments | P3 | Saved card / Stripe subscriptions. |

---

## 8. Memos

| Gap | Priority | Suggested |
|---|---|---|
| Text only | P2 | Attachments (PDF/image) + optional link. |
| No scheduling or expiry | P2 | `publish_at` / `expires_at`. |
| No read receipts | P3 | "Seen by 12/20 parents". |
| No edit history | P3 | Use the audit log. |

---

## 9. Activity log

| Gap | Priority | Suggested |
|---|---|---|
| Only free-text search | P2 | Filters by user, action type and date range. |
| Doesn't log logins/exports/reads | P3 | Broaden coverage; retention policy. |

---

## 10. Teacher — attendance

**Flow today:** class + date register, mark "At school" (**with optional temperature + health note**),
check out with a **watermarked photo** (override + reason allowed), parents notified on check-in and
check-out, plus the day's **medication requests** with mark-given/not-given.

| Gap | Priority | Suggested |
|---|---|---|
| ~~**No bulk "mark all present"**~~ ✅ done | — | One tap sets the whole class at school, then adjust exceptions. |
| ~~No arrival notification to parents~~ ✅ done | — | Parents are notified on check-in too (single + bulk). |
| ~~No temperature / health check at check-in~~ ✅ done | — | Optional temperature + health note on arrival; "Elevated" flag at ≥ 37.5 °C. |
| Only 3 states (`none/school/home`) | P2 | Add **absent (with reason)**, **sick**, **holiday**; half-day/session support. |
| Photos stored only for checkout | P3 | Optional arrival photo. |
| Attendance is per-day, single session | P3 | AM/PM sessions if the centres run half-days. |

---

## 10b. Teacher — health, medication & growth  ✅ (new, 29 Sep 2026)

| Where | What |
|---|---|
| Attendance register | Temperature + health note at **check-in**; **allergies** flagged per child; a **medications** card for the day with **Mark as given / Not given** (staff, time and note recorded; parent notified). |
| **Growth** (`/teacher/growth`, sidebar) | Record height/weight per child/day (BMI auto-calculated; same-day re-entry updates), **class average BMI**, latest-per-child and full history tables. Scoped to the teacher's class. |

| Gap | Priority | Suggested |
|---|---|---|
| No growth chart | P2 | Plot height/weight/BMI over time per child. |
| Pending medication past its time isn't chased | P3 | Nudge staff when a request passes `time_due`. |

---

## 11. Teacher — daily activities

| Gap | Priority | Suggested |
|---|---|---|
| Fixed PERMATA/KSPK checklist | P2 | Custom activity types + notes per child; attach a photo. |
| One child at a time | P1 | **Apply to whole class** (tick the day's activity once), then note exceptions. |
| `treatment_notes` field is free-text and unused in the UI | P3 | Surface it or fold into notes. |

---

## 12. Teacher — progress

| Gap | Priority | Suggested |
|---|---|---|
| One child at a time | P2 | Bulk entry for a class-wide activity. |
| No reuse/templates | P2 | "Copy last week's entry" / templates by sub-theme. |
| 3-point scale only | P3 | Configurable scale; domain-specific ratings. |
| No published report | P2 | **Term progress report PDF** per child (reuses dompdf) + share to chat. |

---

## 13. Teacher — daily updates

| Gap | Priority | Suggested |
|---|---|---|
| Read-only view | P2 | Show **who hasn't submitted today** and chase with one tap. |
| No rollup | P3 | Class summary (sleep/bath/health counts) for the morning. |

---

## 14. Messages

| Gap | Priority | Suggested |
|---|---|---|
| No pagination (loads full history) | P2 | Paginate / load-more. |
| No read receipts or typing | P3 | Delivered/seen ticks. |
| One teacher per conversation | P2 | Allow the parent to choose/loop in the class teacher. |
| No attachments beyond system photos | P2 | General attachments. |
| No admin oversight | P3 | Conversations report (LittleLives has one). |

---

## 15. Parent flows

| Gap | Priority | Suggested |
|---|---|---|
| Financials: pay-all only (see §7) | P1 | Choose months/partial. |
| No **absence request** | P2 | Parent files absence → teacher acknowledges → reflects in attendance. |
| ~~No medication request~~ ✅ done | — | Parent requests from the child page; teacher logs administration. |
| ~~No growth / measurement view~~ ✅ done | — | Height/weight/BMI tiles + trend list on the child page. |
| No statement download | P2 | Monthly/term statement PDF. |
| Daily update can't be corrected after submit | P3 | Allow edit until a cut-off. |
| Can't see teacher's class or timetable | P3 | Class info page. |
| Attendance read-only by design ✅ | — | — |

---

## 16. Cross-cutting / ops

| Gap | Priority | Suggested |
|---|---|---|
| **Header search box does nothing** | P1 | Either implement a real global search (students/memos/payments) or remove it. |
| No push/mobile; PWA disabled | P2 | Enable PWA + web push, or Pusher; optional native wrapper. |
| Scheduler not running in dev/prod | P2 | Ensure cron → `schedule:run` (drives **fee reminders** + photo pruning). |
| Notifications send synchronously | P2 | Queue them (`ShouldQueue`) once many recipients. |
| No reports/analytics beyond the dashboard | P2 | Attendance %, fee collection by class/month, progress summaries; CSV/PDF export. |
| No backups or full data export | P2 | Nightly DB + media backup; admin-triggered export. |
| Audit coverage gaps | P3 | Log logins, exports, profile changes. |
| No accessibility pass | P3 | Keyboard/focus/labels audit. |

---

## Top 10, ranked

1. **F1 — turn on email** (approval, reminders, resets). *Everything else depends on it.* ✅ *channel built — set a real `MAIL_MAILER` for production*
2. **F2 — stop hard-deleting children**; add **withdrawn/archived** status. ✅ *done*
3. **F3 — assign teachers to classes** and scope their access. ✅ *done*
4. **Bulk class activities/progress** (bulk attendance ✅ done).
5. **Parent chooses which months/amount to pay** + due dates & overdue. ✅ *done*
6. **Real global search** (or remove the dead box). ✅ *done*
7. **Absence requests** + absent/sick attendance states.
8. **F4/F5 — guardians & terms** (structural, enables proper reports).
9. **Term progress report PDF** + monthly statement.
10. **Growth chart** + reports/analytics (fee reminders ✅ done, scheduler must run).

---

*Reviewed against the current code (controllers, models, migrations, routes, components) on 27 Sep 2026;
health & safety + growth pass added 29 Sep 2026.*

> **Continuing this work?** Resume the session (or start fresh) using the handoff section in
> [`README.md`](README.md#continuing-this-work-handoff).
