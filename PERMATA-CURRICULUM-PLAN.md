# PERMATA Curriculum — integration plan

*Planning pass, 30 Sep 2026. Based on online research into **Kurikulum PERMATA Negara** and **KSPK**,
mapped against what the system already stores. Nothing here is built yet — this is the design to review
before we start.*

> **Goal.** Make the system a first-class **PERMATA** tool: model the real curriculum (the 4 Asas
> Pengasuhan and the 6 Bidang Pembelajaran), the theme/sub-theme activity structure, per-child
> developmental assessment, and a curriculum-aligned portfolio — instead of today's loose
> "development area" free text.

---

## 1. What PERMATA is (research)

**Program PERMATA Negara** is Malaysia's national early-childhood care-and-education programme,
administered by the **Ministry of Education (KPM), Bahagian PERMATA**, alongside **PERMATA Kurnia** and
**PERMATA STEM Talent**. Its childcare centres are **Pusat Anak PERMATA Negara (PAPN)**; centres are
quality-assured under **PERMATA Q**. PERMATA focuses on children roughly **0–4 years (TASKA)**; the
**4–6 (prasekolah)** band is covered by **KSPK** (and KPM's new **Kurikulum Prasekolah 2026**).

**Curriculum scope = 4 Asas Pengasuhan + 6 Bidang Pembelajaran.**

### 1.1 The 6 Bidang Pembelajaran (learning domains)

| # | Domain (BM) | Focus |
|---|---|---|
| 1 | **Perkembangan Sahsiah, Sosioemosi dan Kerohanian** | character, social-emotional, spiritual |
| 2 | **Perkembangan Bahasa, Komunikasi dan Literasi Awal** | speaking, Q&A, early reading/writing, love of reading |
| 3 | **Perkembangan Awal Matematik dan Pemikiran Logik** | early maths + logical thinking |
| 4 | **Perkembangan Deria dan Pemahaman Dunia Persekitaran** | senses & the world — sub-scopes: **alam hidupan · alam bahan · alam fizikal · alam semesta** |
| 5 | **Perkembangan Fizikal dan Psikomotor** | gross + fine motor |
| 6 | **Perkembangan Kreativiti dan Estetika** | imagination, art, appreciation |

### 1.2 The 4 Asas Pengasuhan (care basics)

**Pemakanan · Keselamatan · Kebersihan · Penjagaan** (nutrition, safety, hygiene, care).

### 1.3 How an activity is structured

A PERMATA activity plan is: **Tema → Sub-tema → Bidang Pembelajaran (lead domain) + Kesepaduan Bidang
(integrated domains) → objectives → materials → steps**. Themes are monthly, e.g. *Diri Saya, Keluarga
Saya, Persekitaran, Haiwan, Tumbuhan, Kenderaan, Perayaan*; sub-themes refine them (e.g. theme
*Persekitaran* → sub-theme *Timbul dan Tenggelam*). Pedagogy: **belajar sambil bermain**, holistic, with
parent and community involvement.

### 1.4 The KSPK side (Tadika, 4–6)

**KSPK** organises learning into **6 Tunjang**: Komunikasi · Kerohanian, Sikap dan Nilai · Keterampilan
Diri · Perkembangan Fizikal dan Estetika · Sains dan Teknologi · Kemanusiaan. KPM's **Kurikulum
Prasekolah 2026** is a new curriculum rolling out, so the Tadika side may need a second curriculum.

> **Sources:** [KPM · Bahagian & Unit (PERMATA)](https://www.moe.gov.my/bahagian-permata) ·
> [KPM · PERMATA Q](https://www.moe.gov.my/permata-q) ·
> [e-Modul Kurikulum PERMATA Negara (IPGM)](https://sites.google.com/moe-dl.edu.my/e-modul-kurikulum-taska/home) ·
> [PAKK3383 · KPN](https://sites.google.com/moe-dl.edu.my/pakk3383-jieraajzn/kurikulum-pendidikan-awal-kanak-kanak-dalam-negara/kurikulum-permata-negara-kpn) ·
> [Modul Aktiviti Taska (sample theme/sub-theme plan)](https://anyflip.com/rmtah/udwt/basic) ·
> [BPK · Kurikulum Prasekolah 2026](https://bpk.moe.gov.my/kurikulum/prasekolah2026).

---

## 2. Current state vs PERMATA

| PERMATA concept | Today | Gap |
|---|---|---|
| 6 domains | `progress_records.development_proficiency` — free text (`Creativity Innovation, Social Skills, Motor Skills, Language Skills, Cognitive Skills`) | Not the real domains; no per-domain rating over time |
| Theme / sub-theme | `progress_records.sub_theme` (free text; seeded `dalaman`) | No theme catalogue or term theme plan |
| 4 Asas Pengasuhan | `daily_activities` logs meals/sleep/hygiene | Not grouped/tagged as the 4 asas; no safety/care checklist |
| Activity plan | ad-hoc progress entries | No theme→domain→objectives→steps planner |
| Portfolio report | CSV export, PDF receipts | No grouped-by-domain child report |
| Quality (PERMATA Q) | — | Nothing |
| Curriculum per age | landing copy says "PERMATA + KSPK" | Not modelled at all |

Useful building blocks already in place: **`list_options`** (admin-editable lists), **centres** +
`ActiveCentre`, **`progress_records`** (+ photos), **`daily_activities`**, **growth**, **dompdf**,
**private image pipeline**, **`ConversationService`** (post to parent chat), and **bilingual EN/BM**.

---

## 3. Design decisions (proposed)

| Question | Proposed decision |
|---|---|
| Model the curriculum as data or code? | **Data.** New `list_options` groups, so admins can edit without a migration (same pattern as classes/blood types). |
| One curriculum or several? | **Several, age/centre-scoped.** Taska → **PERMATA**; Tadika → **KSPK** (and later Kurikulum Prasekolah 2026). Reuse the centre switcher. |
| Extend or replace the progress module? | **Extend.** Keep existing records; add a real `domain_key` and migrate the loose values. |
| Assessment scale | Admin-editable list, default **Emerging / Developing / Secure / Exceeding**. |
| Reports | Reuse **dompdf** + the image pipeline + chat delivery (the Tier-2 "term report"). |
| Bilingual | All labels through EN/BM; BM names are the canonical PERMATA terms, EN provided. |
| PERMATA Q | **Later.** A separate quality-indicator checklist. |

---

## 4. Phased plan

### Phase P1 — Curriculum catalogue (small, do first)
Make the curriculum admin-editable and switch the progress form to the real domains.
- New `list_options` groups (seeded from `Lists::DEFAULTS`):
  - `permata_domain` — the **6 domains** (keys: `sahsiah`, `bahasa`, `matematik`, `deria`, `fizikal`, `kreativiti`).
  - `permata_care_basic` — the **4 asas** (`pemakanan`, `keselamatan`, `kebersihan`, `penjagaan`).
  - `theme` and `sub_theme` — starter monthly themes + sub-themes.
  - `kspk_tunjang` — the **6 tunjang** (for the Tadika side).
  - `assessment_rating` — `emerging`, `developing`, `secure`, `exceeding`.
- No migration needed (`list_options` already supports groups); admins manage them at **`/admin/lists`**.
- `ProgressRecord::permata_activity` / `development_proficiency` gain a real domain reference.
- **Deliverable:** the teacher Progress form offers the 6 real domains; the lists are editable.

### Phase P2 — Developmental assessment (per child, per domain, over time)
- New table **`child_assessments`** — `student_id`, `centre_id`, `period` (or `term_id`), `domain_key`,
  `rating`, `note`, `assessed_by`, `assessed_at` (+ optional evidence photo id).
- Teacher UI: a **domain grid** (6 × rating) saved as a snapshot for a period; per-child.
- Parent UI: per-domain view + trend across periods.
- Migrate the legacy `development_proficiency` values into `domain_key` where they map.
- **Depends on:** a term/period concept — see *F5 academic terms* below.

### Phase P3 — Theme-based lesson planner
- New table **`lesson_plans`** — `centre_id`, `class`, `start_date`/`end_date`, `theme_key`,
  `sub_theme_key`, `lead_domain_key`, `integrated_domain_keys` (JSON), `objectives`, `materials`,
  `steps`, `created_by`.
- Teacher UI: plan a week/theme; the class board shows the current plan; "generate daily activities"
  from a plan.
- Parent UI: "this week's theme" on the child page; memos can reference the month's theme.

### Phase P4 — 4 Asas Pengasuhan tracking
- Tag the existing `daily_activities` fields to the 4 asas and add a small **care checklist**
  (pemakanan / keselamatan / kebersihan / penjagaan) per child/day with notes.
- Parent visibility alongside the daily update. Reuses `list_options` group `permata_care_basic`.

### Phase P5 — PERMATA portfolio / term report (PDF)
- Per-child **PDF** grouped by the 6 domains + 4 asas + growth, with evidence (progress photos),
  downloadable and **posted to the parent chat**.
- This is the Tier-2 "term progress report PDF" from `LITTLELIVES-COMPARISON.md`, now curriculum-aligned.
- Reuses **dompdf**, the private image pipeline and `ConversationService`.

### Phase P6 — PERMATA Q self-assessment (later)
- Admin checklist of PERMATA Q quality indicators with a readiness score and export.

---

## 5. Data-model sketch

```text
# P1 — no schema change (list_options groups)
permata_domain · permata_care_basic · theme · sub_theme · kspk_tunjang · assessment_rating

# P2
child_assessments
  id · student_id · centre_id · period|term_id · domain_key · rating · note
  · assessed_by · assessed_at · created_at/updated_at

# P3
lesson_plans
  id · centre_id · class · start_date · end_date · theme_key · sub_theme_key
  · lead_domain_key · integrated_domain_keys (json) · objectives · materials
  · steps · created_by · created_at/updated_at

# P4 — extend daily_activities (+ asas list group)
# P5 — no new table (report)
# P6
quality_assessments (later)
```

---

## 6. UI touchpoints

| Portal | Change |
|---|---|
| **Admin** | **Lists** gains the curriculum groups; a **Curriculum/Reports** area; later **PERMATA Q**. |
| **Teacher** | **Progress** uses the 6 domains + rating grid; a new **Plan** screen (themes); **Attendance**/daily care shows the 4 asas; **Growth** unchanged. |
| **Parent** | Child page shows **domain progress**, **this week's theme**, **care (asuhan)**; a **Portfolio report** download. |

---

## 7. Dependencies & open questions

1. **Academic terms (F5)** — P2's "per period" assessment and P5's term report both want a **`terms`
   table** (`name`, `start`, `end`, current term setting) and `term_id` on progress/assessments. Propose
   adding a **lightweight terms** slice at the start of P2.
2. **Which Tadika curriculum?** — model **KSPK** now, or wait for **Kurikulum Prasekolah 2026**? (The
   catalogue is data-driven, so both are possible.)
3. **Rating scale** — 3-point (Emerging/Developing/Secure) vs 4-point (add Exceeding). *Proposed: 4-point, editable.*
4. **Domain names** — is BM the canonical label with EN translation, or bilingual from the start? *Proposed: both, BM canonical.*
5. **Legacy data** — keep the existing `development_proficiency` values as-is and map them where sensible (no data loss).
6. **Age banding** — does Taska use *only* PERMATA and Tadika *only* KSPK, or can a centre run both? *Proposed: centre → curriculum, editable.*
7. **PERMATA Q** — in scope or nice-to-have? *Proposed: later.*

---

## 8. Issue register

_Found during a phase, deferred to a later pass. Nothing here yet._

| # | Issue | Impact | Where |
|---|---|---|---|
| — | — | — | — |

---

## 9. Progress log

| Phase | Status |
|---|---|
| P1 — Curriculum catalogue | ⬜ not started |
| P2 — Developmental assessment (+ terms) | ⬜ not started |
| P3 — Theme lesson planner | ⬜ not started |
| P4 — 4 Asas Pengasuhan tracking | ⬜ not started |
| P5 — Portfolio / term report (PDF) | ⬜ not started |
| P6 — PERMATA Q self-assessment | ⬜ not started |
