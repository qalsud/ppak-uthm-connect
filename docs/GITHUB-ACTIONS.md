# GitHub Actions — CI/CD for ppakuthm.com

This is the automation layer on top of [`DEPLOY-PPAKUTHM.md`](DEPLOY-PPAKUTHM.md).

| Workflow | Trigger | What it does |
|---|---|---|
| `CI` (`ci.yml`) | every push / PR | Pint, PHPStan, SQLite + Postgres tests, ESLint, `tsc`, build |
| `Deploy production` (`deploy.yml`) | successful CI on `main`, or manual | DB + photo backup, pull `main`, rebuild, health check |
| `Backup production` (`backup.yml`) | daily at 19:00 UTC / 03:00 MYT, or manual | DB + photo archive with retention |
| `Reseed demo` (`reseed.yml`) | manual only, two safety gates | backup, maintenance mode, `migrate:fresh --seed` |

> **Never make the reseed part of a normal deploy.** It destroys the live database.
> The reseed job requires a typed confirmation **and** the `.allow-reseed` marker on the server.

---

## 1. One-time server setup

Run these on the VPS. `sudo` is required; the deploy user itself does not get sudo.

### 1.1 Create the deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo chown -R deploy:deploy /opt/ppak
```

The deploy key will only be allowed to run `/usr/local/bin/ppak-deploy`, not a shell.
The `docker` group is effectively root-equivalent, so treat the key as a production credential.

### 1.2 Install the deploy helper

The helper lives in the repo, but the installed copy must be **root-owned and not writable by
`deploy`**. That is what makes the forced command meaningful.

```bash
sudo install -o root -g root -m 0755 \
  /opt/ppak/scripts/remote-deploy.sh \
  /usr/local/bin/ppak-deploy
```

Re-run that `install` command whenever `scripts/remote-deploy.sh` changes.

### 1.3 Generate the SSH key on your workstation

PowerShell (Windows):

```powershell
ssh-keygen -t ed25519 -C "github-actions-ppak" -f "$HOME\.ssh\ppak_deploy"
Get-Content "$HOME\.ssh\ppak_deploy.pub"
```

Press Enter twice to leave the key without a passphrase (it will be stored in GitHub Secrets).

### 1.4 Authorise the key with a forced command

Paste the **public key** into the `command="..."` line. There is one long line per key:

```bash
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo tee -a /home/deploy/.ssh/authorized_keys >/dev/null <<'EOF'
command="/usr/local/bin/ppak-deploy",restrict ssh-ed25519 AAAA... github-actions-ppak
EOF
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

`restrict` disables PTYs, port forwarding, agent forwarding and X11. The SSH command is ignored;
the helper reads `SSH_ORIGINAL_COMMAND` and only accepts `deploy`, `backup` or `reseed`.

### 1.5 Test it before touching GitHub

From your workstation:

```powershell
ssh -i "$HOME\.ssh\ppak_deploy" deploy@187.127.114.77 backup
```

That should create a backup under `/opt/ppak/backups` and print the files. Then test a deploy:

```powershell
ssh -i "$HOME\.ssh\ppak_deploy" deploy@187.127.114.77 deploy
```

Both commands must work before enabling automation.

---

## 2. GitHub repository setup

### 2.1 Add the secrets

`gh` CLI (run from the repo):

```powershell
gh secret set SSH_HOST --body "187.127.114.77"
gh secret set SSH_USER --body "deploy"
gh secret set SSH_PORT --body "22"
Get-Content "$HOME\.ssh\ppak_deploy" -Raw | gh secret set SSH_PRIVATE_KEY
ssh-keyscan -H 187.127.114.77 | gh secret set SSH_KNOWN_HOSTS
```

Or use **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `SSH_HOST` | `187.127.114.77` |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | full private key, including `BEGIN`/`END` lines |
| `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -H 187.127.114.77` |

Never commit the private key or paste it into a workflow file.

### 2.2 Create the environments

**Settings → Environments**:

| Environment | Protection |
|---|---|
| `production` | no required reviewers (used by deploy and nightly backup) |
| `production-destructive` | required reviewers + limit to `main` (used only by reseed) |

### 2.3 Add the auto-deploy switch

**Settings → Secrets and variables → Actions → Variables → New repository variable**:

```text
AUTO_DEPLOY = true
```

Leave it unset/false while you test the manual **Deploy production → Run workflow** button.
Once that succeeds, set it to `true`. Every successful CI run on `main` will then deploy.

### 2.4 Protect `main`

**Settings → Branches → Add branch ruleset** (or the older branch protection rule):

- require a pull request before merging,
- require these status checks:
  - `Backend (Pint + Tests)`
  - `Backend (Postgres)`
  - `Frontend (Typecheck + Build)`.

This prevents a broken commit from reaching the deploy job at all.

---

## 3. Daily operation

### Normal change

1. Push/merge to `main`.
2. `CI` runs.
3. If CI succeeds **and** `AUTO_DEPLOY=true`, `Deploy production` runs automatically.
4. The deploy is pinned to the exact commit that passed CI — it does not just pull whatever is
   latest on `main`. The server backs up first, fetches, resets to that commit, rebuilds and checks
   `/up`.
5. If the health check fails, the workflow fails and prints the previous commit plus the rollback
   command. It does **not** auto-rollback the database.

You can also run **Actions → Deploy production → Run workflow** without merging or waiting for CI.
Leave the `sha` input blank to deploy `origin/main`, or enter a previous commit SHA to roll back.

### Backup

Runs daily at 03:00 MYT. You can also run **Actions → Backup production → Run workflow**.

Backups stay in `/opt/ppak/backups`:

- `db-*.sql.gz` — 14 days,
- `storage-*.tar.gz` — 7 days.

These are on the same VPS. For real disaster recovery, copy them off-site (S3/R2/another host) with
`rclone` or a separate backup job.

### Reseed the demo (destructive)

1. On the server, unlock it deliberately:

   ```bash
   touch /opt/ppak/.allow-reseed
   ```

2. In GitHub: **Actions → Reseed demo → Run workflow**, type `RESEED`.
3. Approve the `production-destructive` environment if reviewers are configured.
4. The helper backs up, enables maintenance mode, stops the queue/scheduler, clears uploaded photos,
   runs `migrate:fresh --seed`, restarts everything and removes the marker.
5. Reset the three demo passwords with `php artisan tinker` (see `DEPLOY-PPAKUTHM.md` §9.2).

If the marker is missing, the job fails safely without touching data.

---

## 4. Rollback

The easiest rollback is **Actions → Deploy production → Run workflow** with the previous commit SHA
in the `sha` input.

Manual fallback:

```bash
cd /opt/ppak
git log --oneline -5
sudo -u deploy git reset --hard <previous-sha>
sudo -u deploy docker compose -f docker-compose.nginx.yml up -d --build
```

If the database is wrong, restore the latest dump **before** rebuilding:

```bash
gunzip -c /opt/ppak/backups/db-YYYY-MM-DD-HHMMSS.sql.gz | \
  docker compose -f docker-compose.nginx.yml exec -T postgres \
  psql -U ppak ppak
```

Restore photos by extracting the matching `storage-*.tar.gz` into the `ppak_storage_app` volume.

---

## 5. Troubleshooting

| Symptom | Check |
|---|---|
| `Permission denied (publickey)` | public key line in `/home/deploy/.ssh/authorized_keys`; `ssh -v` from the runner is not available, test locally |
| `unknown action 'deploy ...'` | forced command only accepts `deploy`, `backup`, `reseed` |
| `tracked files ... are modified` | someone edited a tracked file on the server; commit it or discard it |
| health check fails | `docker compose -f docker-compose.nginx.yml logs --tail=120 app`; rollback to previous SHA |
| backup workflow fails | check the Postgres container name/credentials and the `ppak_storage_app` volume |
| deploy skipped after CI | `AUTO_DEPLOY` variable is not `true`, or the CI run was not a `push` to `main` |
| reseed refused | `/opt/ppak/.allow-reseed` was not created, or the confirmation was not exactly `RESEED` |
| scheduled backup did not run | GitHub disables schedules after long repo inactivity; run it manually and check the Actions tab |

---

## 6. What is still manual, on purpose

- **Initial server setup**, SSH key installation and the `ppak-deploy` install.
- **Password rotation** after a reseed.
- **Off-site backup storage** (recommended next step).
- **Rollback decisions** when a deploy is unhealthy.

The goal is that a normal code change needs **zero server commands** from you.
