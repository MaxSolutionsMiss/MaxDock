#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! git diff --quiet || ! git diff --cached --quiet; then
  printf 'Commit or stash changes before creating a handoff ZIP.\n' >&2
  exit 1
fi

release="${1:-DB37}"
destination="${2:-$repo_root/../MaxDock_Claude_Handoff_${release}.zip}"
prefix="MaxDock-Claude-Handoff-${release}/"

git archive --format=zip --prefix="$prefix" --output="$destination" HEAD
unzip -t "$destination" >/dev/null
printf 'Created verified handoff archive: %s\n' "$destination"
