# LittleLives vs PPAK UTHM Connect — feature comparison

*Research pass, 27 Sep 2026. Sources: littlelives.com (home, School Management System, pricing), the
Little Family Room parent app listing (App Store), and LittleLives reviews/roundups (G2, Classroom,
Brightwheel/Lillio guides). Marketing copy is treated as a claim, not a spec.*

---

## 1. What LittleLives actually is

A commercial, multi-tenant SaaS for early-childhood centres, built in Singapore and sold across
SEA (Malaysia, Vietnam, Indonesia, China…). They report **200,000+ children, 2,000+ schools, 12+
countries**, are an **ECDA pre-approved vendor**, and are **ISO 27001** certified. It's sold as four
products:

| Product | Purpose |
|---|---|
| **School Management System** | The core: centre operations, portfolio, events/bulletin, fees, reports |
| **Little Check In** | Enquiries + attendance (predict / manage / track) |
| **Little Family Room** | The **parent app**: portfolio, attendance, check-in/out photos, messages, bulletins, growth, fees |
| **LittleAcademy** | Staff training + performance evaluation (a light HR/talent suite) |

Module-level capabilities (from their own product page):

- **Centre operations** — dashboard, **Centre Log** (internal incident/staff comms), **Enrolment** (new-student pipeline), staff movement oversight
- **Attendance** — digital, **temperature-taking**, **visual health checks**, **automatic parent notifications** on check-in/out, **check-in/out photos**
- **Communications** — "log every moment, from attendance to medication", two-way conversation, bulletins/notices, push notifications
- **Portfolio** — configurable learning checklist, **portfolio report** against the school's own curriculum, 2-way sharing via **photos, videos, text**
- **Events & Bulletin** — shared **school calendar** (parents sync to phone), virtual whiteboard notices
- **Fees** — fee reminders, **instant invoicing**, detailed breakdowns, receipt storage, revenue/balance account, weekly/bi-weekly/monthly schedules
- **Reports** — student/staff/admin analytics, **audit-ready** records, conversations report
- **Parent app extras** — **growth tracking (height, weight, BMI, class average)**, fees/payments, medication requests, absence requests, health tracking

**Business model:** paid per-school SaaS, quote-based pricing, free support/training. Mobile apps
for staff and parents.

---

## 2. Side-by-side

Legend: ✅ at parity · 🟢 we're ahead · 🟡 partial · 🔴 missing

| Capability | LittleLives | PPAK UTHM Connect | |
|---|---|---|---|
| Single login, role-based (admin/teacher/parent) | ✅ | ✅ admin · teacher · parent | ✅ |
| Account approval workflow | ✅ | ✅ pending → approve/reject (+ bulk) | ✅ |
| Student/child records | Full (photo, IC, medical, emergency contacts) | Basic (name, age, class, parent) | 🟡 |
| **Attendance** | Digital, temperature, visual health check | Teacher-marked arrive/depart, class+date register | 🟡 |
| **Check-in / check-out photos** | Yes (parent selfie/wefie at kiosk) | Yes — teacher photo, **watermarked** with name+date/time, **auto-deleted after 3 days**, auto-posted to chat | 🟢 |
| Parent notified on check-out | ✅ | ✅ notification + chat message with photo | ✅ |
| Parent notified on check-**in** | ✅ | — | 🔴 |
| Parent daily updates (sleep, bath, health, arrival) | ✅ | ✅ parent-submitted morning check-in + teacher view | ✅ |
| Medication requests + administration log | ✅ | — | 🔴 |
| Allergies / medical notes | ✅ | — | 🔴 |
| **Growth tracking (height/weight/BMI)** | ✅ | — | 🔴 |
| **Portfolio (photos/videos + evaluation)** | ✅ strong (video too) | Progress records + photos (no video, no portfolio feed) | 🟡 |
| Progress reports against curriculum | ✅ configurable checklist | ✅ PERMATA + KSPK, configurable per record | 🟢 local fit |
| Term/child **progress report export** | ✅ portfolio report | — | 🔴 |
| Two-way chat | ✅ | ✅ parent ↔ teacher per child | ✅ |
| Announcements / bulletins | ✅ + virtual whiteboard | ✅ memos with **audience targeting** (all/parents/teachers/class) | ✅ |
| **School calendar / events** | ✅ (sync to phone) | — | 🔴 |
| **Fees: invoicing + receipts** | ✅ | ✅ monthly records, Stripe Checkout, **PDF receipts** | ✅ |
| **Fee reminders (scheduled)** | ✅ | — | 🔴 |
| Flexible billing (discounts, subsidies, late fees, autopay) | ✅ | Fixed fee + overtime; no discounts/autopay | 🔴 |
| Revenue / outstanding reporting | ✅ account reports | ✅ collected / outstanding / unpaid summary | 🟡 |
| **Admin analytics & reports** | ✅ graphs, audit-ready | Dashboard (income chart, class split) + **activity log** | 🟡 |
| **Enrolment / enquiry pipeline** | ✅ (Little Check In) | Self-registration + approval only | 🔴 |
| Absence requests | ✅ | — | 🔴 |
| Staff attendance / scheduling / ratios | ✅ | — | 🔴 |
| Staff training / performance | ✅ (LittleAcademy) | — | 🔴 |
| Food program / menu | ✅ (per reviews) | — | 🔴 |
| Digital forms / paperwork | ✅ | — | 🔴 |
| Native mobile apps + push | ✅ iOS/Android | Responsive web (PWA intentionally disabled) | 🔴 |
| Multi-language | 5+ (EN/VI/中文/MS/ID) | EN + BM | ✅ for local need |
| Multi-branch | ✅ | Single centre (2 centres via class) | 🔴 |
| Security posture | ISO 27001, ECDA vendor | Role-based, approval, **private photo storage**, audit log | 🟡 |
| Cost | Paid SaaS, quote-based | Self-hosted, no subscription | 🟢 |

---

## 3. Where we already match or beat them

- **Local curriculum, not generic** — PERMATA + KSPK are first-class, not a config puzzle.
- **BM-first bilingual** with a proper language switcher.
- **Checkout photos that are arguably better**: watermarked with child + timestamp, compressed to
  ≤1 MB, stored on a **private disk behind an authorised route**, auto-pruned after 3 days, and
  delivered straight into the parent's chat.
- **Admin audit log** of who changed what.
- **Data ownership** — self-hosted, no per-child subscription, no vendor lock-in.
- **Purpose-built**: two named centres (Taska Hikmah UTHM, Tadika Khalifah Junior) and the exact
  PPAK roles, instead of a generic multi-tenant product.

---

## 4. Gaps worth closing (ranked for a Malaysian kindy/taska)

### Tier 1 — high impact, fits our stack
1. **Arrival notification** to parents (we only notify check-out) + optional end-of-day summary.
2. **Health & medication** — allergy/medical notes on the child profile; parent **medication
   request** → teacher **administration log**; temperature + quick health check on check-in
   (LittleLives' headline attendance feature).
3. **Growth tracking** — height/weight entries → BMI + a simple growth chart per child.
4. **Fee reminders** — scheduled notifications before the due date (needs queues/cron, which we
   already have scaffolding for).

### Tier 2 — clear value, moderate effort
5. **School calendar / events** with bulletins and "add to calendar" links.
6. **Term progress report** — generate a per-child PDF from existing progress records and share it
   to the parent chat (reuses our PDF + image/chat plumbing).
7. **Absence requests** — parent files an absence, teacher acknowledges; ties into attendance.
8. **Light admissions pipeline** — enquiry form → admin list → convert to student.

### Tier 3 — larger, decide if needed
9. **Real push / mobile** — enable Pusher or add PWA **web push** (our PWA is currently disabled).
10. **Staff attendance & scheduling / ratio monitoring.**
11. **Multi-centre** dashboards.
12. **Video support** in progress/portfolio.

### Probably out of scope
- LittleAcademy (staff training/performance), payroll, food-program menus — HR/catering suites that
  PPAK likely doesn't need in this system.

---

## 5. Suggested next step

Do **Tier 1** as one focused pass: it directly closes LittleLives' most visible features
(temperature/health at check-in, medication, growth, reminders) and reuses everything we've built
(notifications, images, chat, queues, PDFs).

---

*Sources: [littlelives.com](https://www.littlelives.com) · [School Management System](https://www.littlelives.com/product/school-management-system) · [Pricing](https://www.littlelives.com/pricing) · [Little Family Room (App Store)](https://apps.apple.com/my/app/little-family-room-for-parents/id1158542738) · [LittleLives on G2](https://www.g2.com/products/littlelives/reviews)*
