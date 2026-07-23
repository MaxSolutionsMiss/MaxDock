# MaxDock handoff: start here

This package gives Claude enough context to continue MaxDock without relying on the earlier ChatGPT conversation. The canonical application name and repository are **MaxDock** and `MaxSolutionsMiss/MaxDock` (the occasional spoken name “MaxStock” refers to this same project).

## Current baseline

- Source branch: `main`
- Source baseline when this handoff was prepared: `53b9a73`
- Production interface release: DB37 / `v58-db37`
- GitHub Pages deployment commit: `36eef0c`
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
7. The most recent `DEPLOYMENT_DB31.txt` through `DEPLOYMENT_DB37.txt`

Use `CLAUDE_START_PROMPT.md` as the first instruction in Claude. Claude should first produce a read-only understanding check; it should not begin by restructuring the app or changing production.
