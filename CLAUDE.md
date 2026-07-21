# MaxDock repository memory

MaxDock is a static GitHub Pages dock-appointment application backed by Supabase Auth, Postgres/RLS/RPCs, and two Supabase Edge Functions. The current production release is DB41, built on the DB31 through DB41 interface and scheduling refinements; DB42 is the active reviewed release branch.

Before changing anything, read every file in `docs/claude-handoff/`, beginning with `START_HERE.md`. Treat those files, the current source, and the connected production schema as a single handoff.

## Non-negotiable invariants

- `main` is the reviewed source branch. GitHub Pages is published from `gh-pages`.
- Never merge a pull request automatically. Prepare the branch and PR, then let the owner merge it.
- Browser-facing files at the repository root and in `db04/` are mirrored. Change and publish both copies together.
- Keep root and `db04/` copies byte-for-byte identical unless an existing, documented exception applies.
- This is a no-build static application. Do not introduce a framework or bundler without explicit approval.
- Never commit passwords, service-role keys, OpenAI keys, database credentials, tokens, `.env` files, or production row data.
- The public Supabase publishable key in `maxdock-config.js` is intentionally browser-visible. It is not a substitute for RLS.
- Apply database DDL only as a clearly named Supabase migration. Inspect the production migration ledger first and do not replay an applied migration.
- Deploy Edge Functions only when their source changes and the release explicitly requires it.
- Preserve audit history. Do not add destructive appointment deletion or reset production Supabase.

## Architecture and source map

- HTML entry points: root and `db04/*.html`.
- Core UI: `maxdock.js`, `maxdock.css`.
- Supabase integration: `maxdock-config.js`, `maxdock-db.js`, `maxdock-integration.js`, `maxdock-auth.js`.
- Page controllers: `maxdock-admin.js`, `maxdock-queue.js`, `maxdock-reports.js`, `maxdock-mis.js`, `maxdock-my-appointments.js`, `maxdock-password.js`.
- Current UI refinement layers: `maxdock-db31-base.css`, `maxdock-db33.css`, `maxdock-db34.css`, `maxdock-db35.css`, `maxdock-db36.css`, `maxdock-db38.css`, `maxdock-db39.css`, `maxdock-db40.css`, `maxdock-db41.css`, `maxdock-db42.css`, `maxdock-ops-density.js`, `maxdock-layout-discipline.js`, `maxdock-db42.js`.
- Supabase SQL history available in this repository: `MaxDock_DB_v11_*.sql` through `MaxDock_DB_v21_*.sql`, mirrored in `db04/`.
- Edge Functions: `supabase/functions/maxdock-invite-user/index.ts` and `supabase/functions/maxdock-ai-brief/index.ts`.
- Live schema snapshot: `supabase/database.types.ts`. Regenerate it after every schema migration.

## Required checks

Run before every commit and again before handoff:

```bash
find . -type f -name '*.js' -not -path './.git/*' -print0 | xargs -0 -n1 node --check
git diff --check
bash ./scripts/verify-root-db04-parity.sh
```

Also manually test the affected roles and workflows described in `docs/claude-handoff/TESTING.md`.

## Release workflow

1. Start from a freshly fetched `main` and create a descriptive `codex/` or `claude/` feature branch.
2. Make the smallest coherent change. Preserve unrelated owner changes.
3. Mirror every browser-facing root change into `db04/`.
4. If schema changes are required, add the SQL release file, apply it once with an explicit migration name, and regenerate `supabase/database.types.ts`.
5. If an Edge Function changes, keep its exact deployed source in this repository and record deployment requirements.
6. Add a release/deployment note and a unique cache marker for changed browser assets when needed.
7. Run all checks, scan for secrets, commit, push, and open a PR. Do not merge it.
8. After the owner merges, publish only the reviewed release to `gh-pages`, wait for Pages, and verify the live DB marker and workflows.

When requirements are ambiguous, summarize the current behavior and ask before changing product logic, security boundaries, roles, routing, or data retention.
