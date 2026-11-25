> **Archived baseline.** Captured on the live build before the November 2026 fixes. Demo passwords have been redacted.

# UAT Execution Report â€” PPAK UTHM Connect

**Target:** https://ppakuthm.com/  
**Test date:** 26 November 2026  
**Result:** **48 scenarios â€” 26 PASS / 17 FAIL / 5 BLOCKED**

> **Credential note:** The supplied password `<redacted-demo-password>` logged in successfully for the Admin account (`<redacted-demo-password>.com`) but returned **HTTP 500** for the seeded Teacher (`teacher@ppakuthm.com`) and Parent (`parent@ppakuthm.com`) accounts. I reset both passwords to `<redacted-demo-password>` via the Admin panel to continue testing. Invalid/pending credentials also produce HTTP 500 instead of a clean validation message â€” see **ADM-18**.

---

## 1. Critical / High-Priority Findings

1. **Login error handling is broken (High).** Wrong passwords for admin, teacher, parent, and UAT accounts all return **HTTP 500 Server Error** instead of "These credentials do not match our records." Pending-account login also returns 500.
2. **Attendance cannot mark Absent, Late, or Excused (High).** Teacher/Admin attendance screens only expose **"At school"** and **"Back home."** Unmarked students show "Not arrived yet"; the "Absent" counter stays 0 even after an absence is approved.
3. **Backdated attendance writes to today (High).** On the 25 Nov view, clicking "At school" submitted `date: 2026-11-26`. The 25th remained empty and today's arrival time changed from 00:38 to 00:39.
4. **Approved absence does not update the attendance register (High).** After approving a 26 Nov absence, the teacher register still showed "Back home"; the 27 Nov approved absence still showed "Not arrived yet." The parent portal showed "Absent" for 27 Nov.
5. **Parent absence validation is too permissive (High).** A past-date absence (20 Nov) was accepted. An absence for today was accepted **after** the child had already been checked in and out, then approved, leaving the same day both "Back home" and "Absence approved."
6. **No gradebook / numeric grades (High, product gap).** There are no assignments, exams, numeric grades, partial saves, or publish-results flows. Only progress ratings **Good / Average / Poor** exist. The requested 88/100 had to be stored as free-text notes.
7. **No academic year, terms, sections, or subjects (High, product gap).** Classes are flat list options only. Teacher-to-class assignment exists; teacher-to-subject assignment does not.
8. **Admin cannot override teacher grades/progress (High, product gap).** The admin progress page has no Edit/Delete controls for an existing progress record. Attendance checkout override works and is audited, but attendance **check-in is not audited** at all.
9. **Future attendance is accepted (High/Medium).** An API request for an in-scope student with date `2026-12-31` created an "At school" record at 01:02 on 31 Dec 2026.
10. **Two parents per student is unsupported (Medium, product gap).** Student has a single-select Parent field. Multiple guardians can be added as contacts, but only one parent account gets portal access.
11. **Parent cannot download invoices/receipts (Medium).** Paid rows on Parent â†’ Financials are not interactive. Admin can download receipt PDFs.
12. **Teacher cannot publish announcements (Medium, product gap).** Teacher â†’ Memos is read-only. Only Admin can create memos. Direct messages work.

---

## 2. Detailed Results

Each row follows the requested fields: **Test ID & Scenario, Active Role, Action Taken, Expected Result, Actual Result, Status, Severity.**

### A. Admin Persona

| Test ID & Scenario | Role | Action Taken | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|
| **ADM-01 Admin login** | Admin | Logged in with `<redacted-demo-password>.com` / `<redacted-demo-password>`; loaded `/admin`. | Admin dashboard with system-wide data. | Dashboard loaded: 10 students, 4 teachers, 5 parents, payments/attendance cards. | **PASS** | â€” |
| **ADM-02 Create parent & teacher accounts** | Admin | Opened Add Parent/Add Teacher; submitted empty; tested invalid email, short password, then created UAT accounts. | Required/format validation; accounts created. | Required name/email/password errors shown; email format and password length validated; accounts created. | **PASS** | â€” |
| **ADM-03 Link parent to student / multi-sibling** | Admin | Added guardian to Student 11; linked UAT Parent; checked seeded parent with 3 children. | Parent linked; one parent sees multiple siblings. | Student shows UAT Test Parent; seeded parent has 3 children and switches cleanly. | **PASS** | â€” |
| **ADM-04 Two parents for one student** | Admin | Looked for a second parent-account link on Student 11. | Ability to link two parent accounts to one student. | Only one single-select **Parent** field; no UI for a second parent account. Guardians are contacts, not portal users. | **BLOCKED** | â€” |
| **ADM-05 Deactivate/disable user control** | Admin | Opened Teacher edit; looked for Deactivate/Inactive. | Explicit deactivate/disable action. | Status options are Pending / Active / Awaiting / Rejected; no "Inactive" or "Deactivate." Delete exists. | **FAIL** | Medium |
| **ADM-06 Immediate session revocation** | Admin | Logged UAT Teacher in via separate PowerShell session; set status to Rejected; requested `/teacher/attendance`. | Existing teacher session revoked immediately. | Request returned **401** immediately. Restoring Active allowed login again. | **PASS** | â€” |
| **ADM-07 Create class + assign teacher** | Admin | Added class option `UAT Class A` (`uatclassa`); assigned UAT Teacher in Teacher edit. | Class created; teacher restricted to it. | Class count increased to 3; teacher row shows UAT Class A / Khalifah Junior. | **PASS** | â€” |
| **ADM-08 Academic year / terms / sections / subjects** | Admin | Searched nav and Lists for academic-year, term, section, subject setup. | Full academic structure. | None exist. Classes are flat list options; no years, terms, sections, or subjects. | **BLOCKED** | â€” |
| **ADM-09 Student enroll / transfer / history** | Admin | Enrolled Student 11; transferred UAT Class A â†’ 5 Tahun â†’ UAT Class A. | Transfers allowed; historical records remain. | Attendance, absences, progress, and payment remained after each transfer. | **PASS** | â€” |
| **ADM-10 Attendance override + audit** | Admin | Admin attendance register for UAT Class A; clicked "Back home"; selected collector; skipped photo with reason. | Override saved and audited. | Departure 00:53, "Back home," collector + no-photo note; activity log shows **Attendance checkout**. | **PASS** | â€” |
| **ADM-11 Attendance check-in audit trail** | Admin | Reviewed Activity Log for teacher/admin check-ins. | All attendance changes audited. | No check-in entries for 00:38/00:39; only checkout at 00:53 is logged. | **FAIL** | Medium |
| **ADM-12 Grade/progress override** | Admin | Opened Admin Progress history for the 88/100 record. | Admin can modify/override a teacher's grade, with audit. | No Edit/Delete controls; only "Record progress" for new entries. | **BLOCKED** | â€” |
| **ADM-13 Fee settings boundary** | Admin | Set "Monthly fee due day" to 29 and saved. | Reject values outside 1â€“28. | HTML and server both rejected: "must not be greater than 28." | **PASS** | â€” |
| **ADM-14 Payment lifecycle + receipt** | Admin | Created November payment for Student 11 (0 OT); marked paid; downloaded receipt. | RM 310 record, Paid status, receipt PDF. | Payment ID 10: RM 310, Paid 2026-11-26; receipt `resit-ppak-uthm-10.pdf` (1.27 MB). | **PASS** | â€” |
| **ADM-15 Negative overtime validation feedback** | Admin | Add Payment with overtime `-5`. | Clear validation error. | No record created, but dialog stayed open with **no visible error**. | **FAIL** | Medium |
| **ADM-16 Memo publish + class targeting** | Admin | Published "UAT Test Announcement" to audience "A class" â†’ UAT Class A. | Only UAT Class A recipients see it. | UAT parent and UAT teacher see it; `parent@ppakuthm.com` does **not**. | **PASS** | â€” |
| **ADM-17 Registration approval** | Admin | Approved new `uat.pending@ppakuthm.com` registration. | Account becomes active and can log in. | Pending 2â†’1; Active 11â†’12; login works and shows empty child list. | **PASS** | â€” |
| **ADM-18 Pending-account login** | Admin / Parent | Attempted login before approval. | Clear "awaiting admin approval" denial. | POST `/login` returned **500**; page only showed the registration flash "Your account is awaiting admin approval." | **FAIL** | High |
| **ADM-19 CSV export** | Admin | Exported Students CSV. | Valid CSV download. | `students.csv` (783 bytes) with 11 rows, including UAT child. | **PASS** | â€” |
| **ADM-20 Input validation & output encoding** | Admin | Created student with DOB `2030-01-01` and name containing emoji + `<script>`; created parent with IC `123`, phone `abc`; viewed across roles. | Reject future DOB/malformed fields; escape output. | Student created, but future DOB was silently dropped (no age/DOB shown); malformed IC/phone accepted; emoji/script safely text-escaped on all views, no XSS alert. | **FAIL** | Medium |
| **ADM-21 Audit/date consistency** | Admin | Reviewed Activity Log, Lists, Memos, Registrations for consistency. | Only successful writes logged; dates consistent. | Two "List created class" entries for one new class; memo/registration show 25 Nov for 26 Nov 00:56 actions while Activity Log shows 26 Nov. | **FAIL** | Low |

### B. Teacher Persona

| Test ID & Scenario | Role | Action Taken | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|
| **TCH-01 Scope / RBAC** | Teacher | UAT Teacher loaded dashboard/attendance; requested `?class=6bintang`; API POST to Students 4, 8, 11. | Only assigned UAT Class A; other class/centre blocked. | Dashboard showed 1 student; class query ignored; Students 4 and 8 returned **403**; own Student 11 returned 302. | **PASS** | â€” |
| **TCH-02 Attendance check-in + parent propagation** | Teacher | Checked UAT child in with 37.5Â°C and a health note; parent viewed dashboard. | Record saved and visible to parent. | Arrival 00:39, parent saw "At school Â· 00:39 Â· 37.5Â°C Elevated" and escaped note. 99Â°C was rejected with 30â€“45 range. | **PASS** | â€” |
| **TCH-03 Absent / Late / Excused marking** | Teacher | Looked for status actions on attendance register. | Mark Present, Absent, Late, Excused. | Only **At school**, **Back home**, **Mark all present**; no Absent/Late/Excused. Unmarked = "Not arrived yet"; Absent count stays 0. | **FAIL** | High |
| **TCH-04 Backdated attendance** | Teacher | Navigated to 2026-11-25, clicked "At school," confirmed. | Record on 25 Nov or block the action. | POST body sent `date: 2026-11-26`; 25 Nov stayed empty; today's arrival changed 00:38â†’00:39. | **FAIL** | High |
| **TCH-05 Edit window / future attendance** | Teacher | Tried past and future dates; API POST for own student with date 2026-12-31. | Edit window enforced; future blocked. | No edit window. Future 31 Dec 2026 "At school" record was created at 01:02. | **FAIL** | High |
| **TCH-06 Progress record (grade analogue)** | Teacher | Recorded "Math Quiz 1," Good/Good, Cognitive Skills, note "88/100." | Grade saved and published to parent. | Progress saved; parent saw Good/Good + "88/100" note. Numeric 88/100 itself is not a grade field. | **PASS** | â€” |
| **TCH-07 Gradebook / assessments** | Teacher | Looked for assignment/exam creation, numeric entry, partial saves, publish. | Gradebook with assessments. | Only progress form with Good/Average/Poor. No assignments, exams, numeric grades, partial saves, or publish-results flow. | **BLOCKED** | â€” |
| **TCH-08 Direct messages + delivery** | Teacher | Sent message to parent; parent replied; teacher re-opened thread. | Two-way delivery with timestamps. | Messages delivered both ways; parent reply visible to teacher. | **PASS** | â€” |
| **TCH-09 Teacher announcement** | Teacher | Opened Teacher â†’ Memos. | Create/send announcement to a class. | Read-only "Announcements from the admin"; no create control. | **BLOCKED** | â€” |
| **TCH-10 Absence receipt / approval** | Teacher | Approved UAT Parent's 26 Nov and 27 Nov absence requests. | Status approved; parent notified. | "Absence approved" toasts; parent saw Approved and notification. | **PASS** | â€” |
| **TCH-11 Approved absence vs register** | Teacher | Re-checked attendance register after approvals. | Approved absence reflected as Absent/Excused. | 26 Nov still "Back home"; 27 Nov still "Not arrived yet"; Absent count 0. | **FAIL** | High |

### C. Parent Persona

| Test ID & Scenario | Role | Action Taken | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|
| **PAR-01 Child ID IDOR** | Parent | Requested `/parent/children/1`, `/4`, `/8`, `/11` from the wrong parent account. | No other family's child data. | **403 Forbidden** for other families' children; non-existent IDs returned 404. | **PASS** | â€” |
| **PAR-02 Cross-role URL access** | Parent | Requested `/admin`, `/admin/students/1`, `/teacher`, `/teacher/attendance`. | 403. | All four returned **403**. | **PASS** | â€” |
| **PAR-03 Search / SQL injection** | Parent | Searched "UAT Test Child" and `' OR 1=1 --` in the parent search. | No cross-family result; no SQL error. | "No results"; no SQL/exception message. | **PASS** | â€” |
| **PAR-04 Multi-child switching** | Parent | Switched between Adam, Aisyah, Fatihah; checked attendance/financials/progress. | Unique per-child data, no stale cache. | Adam RM 620 + attendance; Aisyah approved absence; Fatihah no records; no stale data. | **PASS** | â€” |
| **PAR-05 Cross-role visibility** | Parent | Verified teacher progress/attendance, admin checkout, payment, memo. | All updates accurately reflected. | Saw Good/Good + 88/100 note, Back home 00:53 + collector, November RM 310 paid, UAT memo. | **PASS** | â€” |
| **PAR-06 Absence date validation** | Parent | Submitted From 28 Nov â†’ To 27 Nov; then submitted a past absence (20 Nov). | Reject end-before-start and past dates. | End-before-start correctly rejected; **past 20 Nov accepted** as Pending. | **FAIL** | Medium |
| **PAR-07 Same-day absence conflict** | Parent | Requested absence for 26 Nov after child was checked in/out; teacher approved it. | Block/flag conflict or reconcile attendance. | Accepted and approved; parent sees approved absence **and** "Back home" for 26 Nov; teacher register unchanged. | **FAIL** | High |
| **PAR-08 Progress report / report card** | Parent | Clicked "Progress report" for Adam. | Downloadable report PDF. | `laporan-perkembangan-1.pdf` (1.27 MB) downloaded successfully. | **PASS** | â€” |
| **PAR-09 Invoice / receipt download** | Parent | Looked for invoice/receipt download on Financials. | Download paid invoice/receipt. | Paid rows are non-interactive; only "Pay all" exists. No parent download control. Admin receipt download works. | **FAIL** | Medium |
| **PAR-10 Reply to teacher message** | Parent | Replied to teacher; teacher replied back. | Two-way delivery. | Parent reply appeared; teacher saw it and replied; parent saw the reply. | **PASS** | â€” |
| **PAR-11 Approved new parent empty state** | Parent | Logged in as newly approved `uat.pending@ppakuthm.com`. | Empty dashboard, no data leakage. | Empty children list; 3 public memos; no other family's data. | **PASS** | â€” |

### D. Cross-Role End-to-End Loop

| Test ID & Scenario | Role | Action Taken | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|
| **E2E-01 Admin setup** | Admin | Created UAT Class A, assigned UAT Teacher, enrolled Student 11, linked UAT Parent. | Class + teacher + student + parent linked. | Completed. Class is a flat list option, not a sectioned academic class. | **PASS** | â€” |
| **E2E-02 Teacher marks Absent + posts 88/100** | Teacher | Logged in, verified Student 11, attempted Absent, recorded "Math Quiz 1" with 88/100 note. | Absent status + numeric 88/100 grade. | Student appeared; **Absent action does not exist**; numeric grade does not exist. Workaround: checked in and recorded Good/Good + 88/100 note. | **FAIL** | High |
| **E2E-03 Parent verifies + submits justification** | Parent | Logged in, checked attendance and progress, submitted absence justification. | Parent sees Absent + 88/100; justification submitted. | Saw **At school / Back home**, not Absent; saw 88/100 in progress note; submitted absence requests (including past/same-day, which should have been rejected). | **FAIL** | High |
| **E2E-04 Teacher receives note + changes to Excused** | Teacher | Opened messages/absences; verified parent note; approved absences. | Receipt confirmed; attendance becomes Excused. | Teacher received absence notification and parent message; approval succeeded, but **no Excused status exists** and register did not change. | **FAIL** | High |
| **E2E-05 Admin master attendance + grade report** | Admin | Pulled UAT Class A attendance and progress history; checked audit log. | All teacher/parent/admin updates match. | Attendance and 88/100 progress are visible; however approved absence conflicts with "Back home," 27 Nov shows Absent only on parent side, and a future 31 Dec record exists. | **FAIL** | High |

---

## 3. Evidence Highlights

- **Login 500:** `POST /login` with `parent@ppakuthm.com` / `<redacted-demo-password>` returned `500 {"message":"Server Error"}`. Same for wrong passwords on admin/teacher/UAT accounts, and for the pending account before approval.
- **Attendance POST:** On the 2026-11-25 page, the request body was `{"action":"arrive","date":"2026-11-26",...}`. Record appeared under 26 Nov.
- **Attendance UI:** Teacher/Admin register had only `At school` and `Back home`; approved absences did not change `Absent` count.
- **Absence conflict:** Parent portal showed 26 Nov "Back home" plus an approved absence; teacher register showed 26 Nov "Back home" and 27 Nov "Not arrived yet."
- **Future attendance:** Admin student history contains `Thu, 31 Dec 2026 â€” Arrived: 01:02 â€” At school`.
- **Audit log:** Shows `Attendance checkout` at 00:53, `Progress recorded`, `Absence approved`, `Payment created/status`, `Memo created`; does **not** show teacher/admin check-ins.
- **Downloads:** `students.csv` (783 bytes), `laporan-perkembangan-1.pdf` (1.27 MB), `resit-ppak-uthm-10.pdf` (1.27 MB).
- **Memo isolation:** UAT memo visible to UAT parent/teacher; absent from `parent@ppakuthm.com` memos.
- **IDOR:** Parent requesting another family's child returned 403; Teacher POSTing attendance for same-centre/different-class and other-centre students returned 403.

---

## 4. Test Data / Changes Made

Created, clearly labelled "UAT":

- **Class:** `UAT Class A` (list value `uatclassa`), Tadika Khalifah Junior.
- **Teacher:** `UAT Test Teacher` (`uat.teacher@ppakuthm.com`), password `<redacted-demo-password>`, assigned to UAT Class A.
- **Student:** `UAT Test Child ðŸ§’ <script>alert(1)</script>` (ID 11), UAT Class A, parent UAT Test Parent.
- **Parent:** `UAT Test Parent` (`uat.parent@ppakuthm.com`), password `<redacted-demo-password>`.
- **Pending parent:** `UAT Pending Parent` (`uat.pending@ppakuthm.com`), registered publicly and approved.
- **Memo:** "UAT Test Announcement," audience A class â†’ UAT Class A.
- **Payment:** Payment ID 10, November RM 310, marked Paid 2026-11-26; receipt downloaded.
- **Attendance:** 26 Nov arrival 00:39, departure 00:53, temp 37.5Â°C, health note, no-photo checkout override; 31 Dec 2026 arrival 01:02 via API scope test.
- **Absences:** 20 Nov Pending; 26 Nov Approved; 27 Nov Approved.
- **Existing data changes:** Reset `parent@ppakuthm.com` and `teacher@ppakuthm.com` passwords to `<redacted-demo-password>`; approved seeded absence for `Nur Aisyah binti Ahmad Faizal` (27â€“28 Nov).

These records are retained as UAT evidence and can be removed/archived by Admin.

---

## 5. Test Limitations

- **No live push test:** One browser cookie jar meant roles were switched sequentially. Cross-role data propagation was verified after page load/navigation, not via WebSocket push while both sessions stayed open.
- **No screenshots:** The desktop window was not visible to the automation surface; evidence is DOM/HTTP-based.
- **Mobile viewport / tablet layout:** Not exercised.
- **Bulk actions:** "Mark all present" exists but was not executed to avoid mass-changing live attendance.
- **Registration reject:** Approve was tested; Reject was not executed to avoid altering the existing seeded pending account.
- **File uploads:** Photo/MC upload flows were not exercised end-to-end.
- **Numeric grade boundaries:** Cannot test >100 or <0 because no numeric grade field exists.

---

## 6. Recommended Fix Priority

1. Fix login error handling: invalid, pending, and inactive accounts should return a clear validation message, not HTTP 500. Reconcile the supplied teacher/parent credentials.
2. Implement absent/late/excused attendance states and make approved absences update the attendance register.
3. Fix backdated and future attendance; enforce an edit window and always submit the selected date.
4. Reject past and same-day absences when attendance already exists; reconcile conflicts.
5. Add the missing gradebook/assessment workflow, or formally descope numeric grades and report cards.
6. Allow Admin to correct teacher grades/progress with audit logging; audit attendance check-ins.
7. Add Parent invoice/receipt downloads, multi-parent access, and teacher announcements.
8. Tighten validation: future DOB, IC/phone formats, negative overtime feedback.
9. Fix the audit log false positive for duplicate class creation and the timezone/date inconsistency.
