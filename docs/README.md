# Project documentation

Start with the root [README](../README.md) for the feature map, setup and local development.

## Start here

| Doc | Status | Contents |
|---|---|---|
| [`HANDOFF.md`](HANDOFF.md) | **current** | Verified state, environment, decisions and next steps — read this first in a new session |
| [`DEBT-REGISTER.md`](DEBT-REGISTER.md) | **current** | Prioritised technical-debt ledger (P0–P3) |
| [`DEPLOY.md`](DEPLOY.md) | **current** | Demo deployment: tunnel, Railway/Render, serverless, demo script |
| [`DEPLOY-SERVER.md`](DEPLOY-SERVER.md) | **current** | Full stack on your own VPS (Caddy, or nginx + certbot), with HTTPS |
| [`DEPLOY-SUPABASE.md`](DEPLOY-SUPABASE.md) | **current** | Supabase Postgres + Storage for a temporary demo |
| [`DEPLOY-PPAKUTHM.md`](DEPLOY-PPAKUTHM.md) | **runbook** | Exact deployment used for the live `ppakuthm.com` instance (nginx + certbot + Docker) |
| [`GITHUB-ACTIONS.md`](GITHUB-ACTIONS.md) | **runbook** | CI/CD: auto-deploy, nightly backup and guarded reseed workflows |
| [`UI-UX-REVIEW.md`](UI-UX-REVIEW.md) | **current** | Screenshot-based UI/UX audit (Nov 2026) with prioritised fixes |
| [`UAT-REPORT-PPAKUTHM-2026-11-26.md`](UAT-REPORT-PPAKUTHM-2026-11-26.md) | baseline | Redacted pre-fix UAT execution report (48 scenarios) |
| [`FIX-PLAN-2026-11.md`](FIX-PLAN-2026-11.md) | **plan** | Combined UI/UX + UAT fix plan, decisions, phases and acceptance criteria |
| [`demo-accounts.txt`](demo-accounts.txt) | reference | Seeded demo emails; public deployments rotate the passwords |

## Plans

| Doc | Status | Contents |
|---|---|---|
| [`ADMIN-CONTROL-PLAN.md`](ADMIN-CONTROL-PLAN.md) | done | Phased admin plan + issue register |
| [`CHECKOUT-PHOTOS-PLAN.md`](CHECKOUT-PHOTOS-PLAN.md) | shipped | Watermarked checkout photos, retention and chat delivery |
| [`PERMATA-CURRICULUM-PLAN.md`](PERMATA-CURRICULUM-PLAN.md) | **KIV** | PERMATA curriculum integration; awaiting stakeholder input |

## Reviews and reference

Historical context — useful when revisiting a module, but `HANDOFF.md` is the source of truth for
the current state.

| Doc | Contents |
|---|---|
| [`ADMIN-REVIEW.md`](ADMIN-REVIEW.md) | Admin sweep: what was fixed, backlog progress |
| [`FUNCTIONAL-REVIEW.md`](FUNCTIONAL-REVIEW.md) | Module-by-module functionality review |
| [`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md) | Feature comparison vs LittleLives + gap roadmap |
| [`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md) | Messaging module sweep (functionality, UX, UI) |
| [`PARENT-TEACHER-REVIEW.md`](PARENT-TEACHER-REVIEW.md) | Parent/teacher audit + progress overhaul |
