# Security Audit — November 2026

> **React + Inertia.js detected — Laravel OWASP checklist AND React/Inertia security checks were both applied.**

**Target:** `https://ppakuthm.com` (live) and the `main` branch at the time of the audit.
**Scope:** authentication, authorization, file uploads/downloads, payments, PWA, CI/CD and the
production configuration visible in the repository.
**Outcome:** no critical or high-severity issue found in the application code that would block the
demo. Several high-value hardening fixes were applied; the remaining items are operational or
defence-in-depth.

> This report deliberately contains no passwords, tokens, `.env` values or private keys.

---

## 1. Live header checks

| Header / check | Result |
|---|---|
| HTTPS + redirect | PASS |
| `Strict-Transport-Security` | PASS — `max-age=31536000; includeSubDomains` |
| Session cookie | PASS — `Secure`, `HttpOnly`, `SameSite=Lax` |
| `X-Content-Type-Options` | PASS on normal responses |
| `X-Frame-Options` | PASS — `SAMEORIGIN` |
| `Referrer-Policy` | PASS — `strict-origin-when-cross-origin` |
| `Permissions-Policy` | PASS — camera, microphone, geolocation disabled |
| `X-Powered-By` | PASS — removed from live responses after the 26 Nov deploy |
| Security headers on 404/error pages | PASS — headers now present on live error responses |
| `Content-Security-Policy` | **FAIL** — no CSP yet (see residual risks) |
| `APP_DEBUG` | PASS — 404 responses show no debug/stack trace |
| `Server` banner | **WARNING** — nginx version still visible; `server_tokens off` added to the template, live reload pending |

---

## 2. OWASP Top 10

### A01 — Broken Access Control

- **PASS** Role middleware is applied to every role area: `admin/*`, `teacher/*`, `parent/*`.
- **PASS** Parent child pages, photos, absence documents, receipts and messages use ownership checks.
- **PASS** Teacher data uses `canManage()` / `visibleTo()`, matching centre **and** class.
- **PASS** Admin photo/attachment routes check the student/memo visibility rules.
- **PASS** Broadcasting authorization now requires an authenticated session (`web + auth`).
- **PASS** Registration approval is admin-only; bulk endpoints filter by role and pending status.
- **PASS** Last active administrator cannot be deactivated or deleted.
- **PASS** 308 tests cover IDOR and cross-centre access; the full suite passes on SQLite and Postgres.
- **FAIL (fixed in this audit)** Teacher CSV import created active teachers with **no class and no
  centre**, which made them effectively unrestricted. Import now requires `class`, `centre` and a
  password of at least 8 characters, and skips rows that do not meet those rules.
- **FAIL (fixed in this audit)** A child with a null `centre_id` was visible to any teacher with a
  matching class across centres. Student create/update/import now falls back to the active or first
  centre instead of leaving the child unassigned.
- **WARNING** A teacher in the same class/centre can update or delete another teacher's progress
  record. This may be intentional collaboration, but it is a horizontal privilege choice worth
  confirming.

### A02 — Cryptographic Failures

- **PASS** Passwords use Laravel's `hashed` cast / `Hash::make`; no MD5, SHA1 or plaintext.
- **PASS** `APP_KEY` is set per environment and `.env` is never committed.
- **PASS** Password reset and email verification use Laravel's signed/token flows.
- **PASS** Stripe secret and webhook secret live only in `.env` / GitHub secrets.
- **WARNING** `SESSION_ENCRYPT` and `INERTIA_ENCRYPT_HISTORY` are false in the current live `.env`.
  The server example now sets both to true; apply them to the live `.env` when convenient.
- **WARNING** Backups are stored unencrypted on the same VPS. Copy them off-site and encrypt them
  with `age`/GPG for a real disaster-recovery posture.

### A03 — Injection

- **PASS** No user input is concatenated into `whereRaw`, `selectRaw`, `orderByRaw` or `DB::raw`.
  The two `selectRaw('class, count(*)...')` / `selectRaw('status, count(*)...')` calls are constants.
- **PASS** Controllers use `$request->validated()`; models use explicit `$fillable`; no `$guarded = []`.
- **PASS** No `{!! !!}` with user data in Blade. PDF templates use escaped `{{ }}` output.
- **PASS** No `dangerouslySetInnerHTML`, `eval`, `new Function` or string `setTimeout` in React.
- **PASS** Upload file names are random ULIDs / generated paths; original names are metadata only.
- **FAIL (fixed in this audit)** CSV exports could turn a name beginning with `=`, `+`, `-` or `@`
  into a spreadsheet formula. `Csv::download()` now prefixes those cells with an apostrophe.
- **PASS** The CSV import reader is not an execution path; imports are validated per column.

### A04 — Insecure Design

- **PASS** Payment amounts and covered records are calculated server-side; the client cannot choose
  the price. Stripe metadata is limited to the payment ID.
- **PASS** Payment completion is idempotent and atomic; webhook + success-page races cannot double
  complete or double-notify.
- **PASS** Destructive reseed is guarded by a manual workflow, environment approval and a server-side
  marker file; it is not part of normal deployment.
- **PASS** The deploy helper refuses to run with a dirty tracked tree.
- **PASS** Attendance/absence rules are enforced server-side (future dates, same-day conflicts,
  approve-with-attendance conflicts).

### A05 — Security Misconfiguration

- **PASS** `APP_ENV=production`, `APP_DEBUG=false`; live 404s do not expose debug output.
- **PASS** `.env` is gitignored; only `.env.example` / `.env.server.example` are tracked.
- **PASS** Production database uses a dedicated `ppak` user, not root.
- **PASS** The entrypoint chowns `storage` and `bootstrap/cache` to `www-data`; logging goes to stderr.
- **FAIL (fixed in this audit)** `trustProxies(at: '*')` trusted any caller and combined with nginx's
  appended `X-Forwarded-For`; a client could spoof the IP used by rate limiting and audit logs.
  The code now trusts loopback + the Docker bridge range, and the nginx template overwrites
  `X-Forwarded-For` with `$remote_addr`.
- **PASS** No CORS config is needed because there are no public API routes. Stripe webhook is a
  server-to-server callback, not a browser CORS request.
- **WARNING** Live nginx still needs the template change applied (`X-Forwarded-For $remote_addr`
  and `server_tokens off`) and a reload.

### A06 — Vulnerable & Outdated Components

- **PASS** `composer audit` — no advisories.
- **PASS** `npm audit` — 0 vulnerabilities after updating the lockfile (`vite`, `concurrently`,
  `shell-quote`, `source-map-js`, and related transitive packages).
- **PASS** CI now uses `npm ci` and audits the full dependency tree; `composer audit` is already a gate.
- **PASS** Laravel 12.71 / PHP 8.3 are current supported releases.

### A07 — Identification & Authentication Failures

- **PASS** Laravel Breeze session auth; passwords hashed with bcrypt/argon2.
- **PASS** `session()->regenerate()` after login; logout invalidates and regenerates CSRF.
- **PASS** `LoginRequest` rate-limits failed attempts to 5 per email+IP; inactive attempts now count
  toward the same limiter.
- **PASS (fixed in this audit)** Auth routes now also have IP-level throttles for login, registration,
  forgot/reset password, password confirmation and password update.
- **PASS (fixed in this audit)** Forgot-password and reset-password no longer reveal whether an email
  exists. Unknown emails receive the same generic status as known emails.
- **PASS** Password reset tokens expire after 60 minutes and the broker throttles resets.
- **PASS** Email verification links are signed and throttled.
- **PASS** Inactive/pending/deactivated accounts are logged out by `account.active`.
- **PASS** Session cookie is Secure, HttpOnly and SameSite=Lax; HTTPS is enforced.
- **WARNING** Session lifetime is 120 minutes; consider 30–60 minutes for the live demo.
- **WARNING** `MAIL_MAILER=log` means password-reset links are written to application logs. Use SMTP
  or a mail API before enabling self-service resets outside the demo.

### A08 — Software & Data Integrity Failures

- **PASS** CSRF is active for the web group; only `stripe/webhook` is excluded, and it verifies the
  Stripe signature.
- **PASS** No `unserialize`, `eval` or `extract` of request data.
- **PASS** Stripe webhook uses `Webhook::constructEvent` with the endpoint secret.
- **PASS** Deploy is pinned to the commit that passed CI, not just `origin/main` at deploy time.
- **WARNING** GitHub Actions are pinned by major tags (`actions/checkout@v4`, etc.), not commit SHAs.
  Pin them to SHAs if the repository is shared with untrusted collaborators.

### A09 — Security Logging & Monitoring

- **PASS** Failed and inactive login attempts log email + IP, never the password.
- **PASS** Activity log records account, attendance, fee, memo and progress changes.
- **PASS** Payment failures/refunds are reported; container logs go to stderr / Docker logs.
- **WARNING** No Sentry/Telescope-style external alerting is configured. For a demo this is
  acceptable; for production, alert on 5xx, failed logins and webhook failures.

### A10 — Server-Side Request Forgery

- **N/A** The application performs no user-supplied URL requests.
- **PASS** The only outbound HTTP calls are Stripe API calls with configured base URLs.
- **PASS** PDF views load local logo files, not remote images.

---

## 3. Additional Checks

- **PASS** No `exec`, `shell_exec`, `system` or `passthru` with user input.
- **PASS** No open redirects from request input; `redirect()->intended()` uses the session.
- **PASS** File uploads validate MIME, extension and size; images are re-encoded, EXIF-stripped and
  thumbnailed; PDFs are size-limited and served as attachments.
- **PASS** Uploaded files live on the private `attendance` disk; only authorised routes serve them.
- **PASS** No `localStorage`/`sessionStorage` secrets. The only local value is the PWA install-dismiss
  flag.
- **PASS** PWA service worker caches only `/build/*`, `/images/pwa/*` and the offline page. It does
  not cache HTML, Inertia payloads, messages, child data or API responses.
- **PASS** CSRF token and XSRF cookie remain active; Inertia uses its normal XSRF flow.
- **PASS** Security headers are now applied globally, including error responses.
- **WARNING** No CSP. The app uses Ziggy inline routes and inline Tailwind/Radix styles, so a strict
  policy needs nonces (`Vite::useCspNonce()` and a Ziggy nonce) before enforcement. A report-only
  policy is the safe next step.

---

## 4. React + Inertia Checks

### R1 — XSS in React
- **PASS** No `dangerouslySetInnerHTML` with user data.
- **PASS** No `eval` / `new Function`.
- **PASS** Links from user data are route-generated or `mailto:`/`tel:`; no `javascript:` URLs.
- **PASS** `Item.data.url` comes from server-generated notifications, not user input.

### R2 — Inertia Data Exposure
- **PASS** `auth.user` is the authenticated user's own model; `password`, `remember_token` and
  `activation_token` are hidden.
- **PASS** No API keys, Stripe secrets or admin credentials are passed as props.
- **PASS** Child/message/receipt props are scoped by the server.
- **WARNING** Inertia history encryption is off in the live `.env`; sensitive child/message pages can
  remain in browser history state. The server example now sets `INERTIA_ENCRYPT_HISTORY=true`.

### R3 — CSRF in Inertia
- **PASS** Inertia XSRF flow is intact; no custom fetch bypasses CSRF for mutations.
- **PASS** Webhook/callback routes are the only CSRF exclusions.

### R4 — Authentication State in React
- **PASS** Role checks are mirrored server-side; React checks are presentation only.
- **PASS** `auth.user` contains only fields the UI needs.

### R5 — Sensitive Data in Browser
- **PASS** No secrets in `VITE_*`; only Reverb public connection values are baked in.
- **PASS** No sensitive values in local/session storage.
- **PASS** PWA cache contains static assets only.

### R6 — Dependency Security
- **PASS** `npm audit` now reports 0 vulnerabilities.
- **PASS** React 18 and Inertia 2 are supported releases.
- **PASS** Third-party UI packages (Radix, lucide, sonner) are current.

---

## 5. What was changed in this audit

| Change | File(s) |
|---|---|
| Trusted proxies restricted; Docker bridge range added | `bootstrap/app.php`, `.env.example`, `.env.server.example` |
| Nginx overwrites `X-Forwarded-For`; server tokens off in template | `docker/nginx/ppakuthm.com.conf` |
| Security headers moved to global middleware (error pages too) | `bootstrap/app.php`, `tests/Feature/SecurityHeadersTest.php` |
| `expose_php=Off` and `X-Powered-By` unset | `docker/php.ini`, `public/.htaccess` |
| Auth-route IP throttles | `routes/auth.php` |
| Login inactive attempts count toward the limiter | `app/Http/Requests/Auth/LoginRequest.php` |
| Password reset responses no longer enumerate emails | `app/Http/Controllers/Auth/PasswordResetLinkController.php`, `NewPasswordController.php` |
| Broadcasting auth requires a session | `bootstrap/app.php`, `tests/Feature/RealtimeMessagesTest.php` |
| Teacher CSV import requires class, centre and strong password | `app/Http/Controllers/Admin/TeacherController.php`, UI hint, tests |
| Student create/import falls back to a centre | `app/Http/Controllers/Admin/StudentController.php` |
| CSV formula-injection protection | `app/Support/Csv.php`, `tests/Feature/CsvExportTest.php` |
| Dependency lockfile updated; CI uses `npm ci` and full `npm audit` | `package-lock.json`, `.github/workflows/ci.yml` |
| Session/history encryption recommended in server env | `.env.server.example` |

**Verification:** 308 tests pass on SQLite and Postgres 16; Pint, PHPStan, ESLint, `tsc` and the
production build pass; `composer audit` and `npm audit` both report zero advisories.

---

## 6. Remaining operational actions

1. **Apply the nginx template change on the live server** and reload nginx:

   ```bash
   sudo nano /etc/nginx/sites-available/ppakuthm.com.conf
   # in the app server block:
   # proxy_set_header X-Forwarded-For $remote_addr;
   # server_tokens off;
   sudo nginx -t && sudo systemctl reload nginx
   ```

   This is the only remaining piece of the proxy-spoofing fix; the Laravel side is already deployed.

2. **Add these to the live `.env`** when the demo is not in progress:

   ```ini
   SESSION_ENCRYPT=true
   INERTIA_ENCRYPT_HISTORY=true
   ```

   Both use `APP_KEY` and invalidate existing sessions/history. Keep `APP_DEBUG=false`.

3. **Configure mail** before relying on self-service password resets, or keep resetting demo
   passwords through the admin panel / tinker.

4. **Add branch protection** for `main` requiring the three CI checks. `AUTO_DEPLOY=true` currently
   deploys any direct push that passes CI.

5. **Pin GitHub Actions to commit SHAs** and keep the deploy key restricted to the forced command.

6. **Move backups off-site** (S3/R2/another host) and encrypt them; the current backups share the VPS
   with the database.

---

## 7. Summary

### Fixed during this audit
- Teacher import no longer creates unrestricted active accounts.
- Student records can no longer be left without a centre.
- Password reset no longer enumerates accounts.
- Login/auth/password routes have IP throttles.
- Proxy IP spoofing risk removed from the code and nginx template.
- CSV exports cannot inject spreadsheet formulas.
- Error pages receive the same security headers.
- PHP version leak removed.
- Dependency advisories cleared; CI now audits the full npm tree.
- Broadcasting authentication requires a session.

### Remaining warnings
- No CSP yet (needs nonce work because of Ziggy inline routes and inline styles).
- Live nginx still needs the template change and reload.
- Live `.env` still has session/history encryption off.
- Password reset emails go to logs while `MAIL_MAILER=log`.
- Branch protection and GitHub Action SHA pinning are not configured.
- Backups are on the same VPS and unencrypted.
- Same-class teachers can edit each other's progress records.

No issue was found that should block the demo. The highest-value residual action is applying the
nginx proxy-header change; the Laravel code already contains the matching trust configuration.
