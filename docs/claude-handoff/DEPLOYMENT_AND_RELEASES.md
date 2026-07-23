# Deployment and releases

## Branches

- `main`: reviewed source of truth; currently contains merged DB71 / PR #60.
- Feature branches: one coherent change per branch/PR.
- `gh-pages`: live static deployment branch.

Do not commit feature work directly to `main` or `gh-pages`, and never merge a PR automatically. The owner reviews and merges the source PR.

## Normal release sequence

1. Fetch `main`, create a feature branch, and confirm a clean working tree.
2. Implement root and `db04/` changes together.
3. Add a deployment note describing user-visible behavior, database/Edge requirements, files, and verification.
4. For DDL, apply one forward-only named Supabase migration and capture the exact SQL in the repository. Never use raw DDL outside migration tracking.
5. For Edge Function changes, deploy the reviewed checked-in source and record whether gateway JWT verification is enabled.
6. Run JavaScript syntax, whitespace, parity, role-flow, and secret checks.
7. Commit, push, and open a PR against `main`. Leave it open for owner review.
8. After the owner merges, publish the exact reviewed browser files and release notes to `gh-pages`.
9. Wait for GitHub Pages Actions to finish, then verify the live URL and active release marker.

## Current production

- Main and Pages commit: `4fb1a5f3611fdab91f42eee43dff41011e617724` — DB70
- Cache marker: `v91-db70`
- Gear-menu marker: `DB70 · shared document tools`
- Live path: `https://maxsolutionsmiss.github.io/MaxDock/db04/`

DB71 / PR #60 is merged on `main` but not production because `gh-pages` still
points to DB70. The `v93-db71` live-readiness hotfix keeps document actions in
the page-title row and repairs the Queue settings/full-screen contracts. It must
be reviewed and merged before `gh-pages` is fast-forwarded to the approved DB71
commit. Every browser release must use a deliberate unique cache marker so
testers do not mistake cached assets for the new version.

## Rollback reference

DB70 / PR #59 at `4fb1a5f3611fdab91f42eee43dff41011e617724`
is the approved rollback reference. Rollback must be a normal, reviewed forward
commit or revert PR; do not rewrite shared branch history or reset Supabase.
