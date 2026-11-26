# Scripts

| Script | Purpose |
|---|---|
| `start-server.bat` | Windows local dev launcher: app server (`8001`), Vite (`5173`), queue worker, scheduler and Reverb (`8082`). Run it from Explorer or with `scripts\start-server.bat`. |
| `remote-deploy.sh` | Root-owned production helper for the VPS: `deploy`, `backup` and guarded `reseed`. Installed as `/usr/local/bin/ppak-deploy`; see [`docs/GITHUB-ACTIONS.md`](../docs/GITHUB-ACTIONS.md). |
