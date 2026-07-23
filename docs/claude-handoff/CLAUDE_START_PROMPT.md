# First prompt for Claude

Copy this into the first Claude/Claude Code conversation:

> You are continuing the MaxDock application in `MaxSolutionsMiss/MaxDock`. Before changing anything, read `CLAUDE.md` and every file in `docs/claude-handoff/`, then inspect the current `main` branch and the connected Supabase project read-only. Confirm DB70 / PR #59 at `4fb1a5f3611fdab91f42eee43dff41011e617724` as the production and rollback reference; treat DB71 as an unmerged review candidate unless the owner says otherwise. Confirm the architecture, roles, root/`db04` mirroring rule, production migration ledger, deployed Edge Functions, and release workflow. Identify any drift between GitHub and Supabase. Do not expose secrets or production row data, do not reset Supabase, do not deploy or modify production, and do not merge a PR. First return a concise understanding summary and the checks you would run. Wait for my next requested change before editing.

For each later change, ask Claude to work on a new branch, preserve root/`db04` parity, use named Supabase migrations only when necessary, run the repository checks, and open a PR without merging it.
