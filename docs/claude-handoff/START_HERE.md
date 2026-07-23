# MaxDock handoff: start here

This package gives Claude enough context to continue MaxDock without relying on the earlier ChatGPT conversation. The canonical application name and repository are **MaxDock** and `MaxSolutionsMiss/MaxDock` (the occasional spoken name “MaxStock” refers to this same project).

## Current baseline

- Source branch: `main`
- Production reference commit: `4fb1a5f3611fdab91f42eee43dff41011e617724`
- Production interface release: DB70 / `v91-db70` / PR #59
- Main source release: DB71 / PR #60 (merged, not deployed)
- Current review candidate: DB71 live-readiness hotfix / `v93-db71`
- Production GitHub Pages commit: `4fb1a5f3611fdab91f42eee43dff41011e617724`
- Live application: `https://maxsolutionsmiss.github.io/MaxDock/db04/`
- Supabase project URL: `https://rywzqepzramurbrpmept.supabase.co`

## Recommended transfer

Use the connected GitHub repository as the source of truth. Merge the handoff PR when reviewed, then ask Claude to read `CLAUDE.md` and this directory before it modifies anything. The ZIP is a portable backup for a Claude Project or another environment; it deliberately excludes Git history, secrets, and database row data.

## Reading order

1. `CLAUDE.md`
2. `ARCHITECTURE.md`
3. `PRODUCT_RULES.md`
4. `SUPABASE_STATE.md`
5. `DEPLOYMENT_AND_RELEASES.md`
6. `TESTING.md`
7. `DEPLOYMENT_DB70.txt`, then `DEPLOYMENT_DB71.txt` for DB71 and its live-readiness hotfix

Use `CLAUDE_START_PROMPT.md` as the first instruction in Claude. Claude should first produce a read-only understanding check; it should not begin by restructuring the app or changing production.
