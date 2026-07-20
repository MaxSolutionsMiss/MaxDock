# Deployment and releases

## Branches

- `main`: reviewed source of truth; currently contains DB37.
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

- Main merge: `53b9a73` — DB37
- Pages commit: `36eef0c` — DB37
- Cache marker: `v58-db37`
- Gear-menu marker: `DB37 · DB36 interface active`
- Live path: `https://maxsolutionsmiss.github.io/MaxDock/db04/`

DB37 is frontend-only. It forces fresh DB31–DB36 assets and guarantees DB33 initialization before DB36. Any future browser release must use a deliberate unique cache marker so testers do not mistake cached assets for the new version.

## Rollback reference

DB31 remains the approved visual reference point. Rollback must be a normal, reviewed forward commit or revert PR; do not rewrite shared branch history or reset Supabase.
