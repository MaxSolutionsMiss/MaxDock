#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-origin/main}"
if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  base_ref="HEAD"
fi

added="$(
  {
    git diff --name-only --diff-filter=A "$base_ref"...HEAD
    git diff --name-only --diff-filter=A
  } | sort -u | grep -E '(^|/)(maxdock-db[0-9]+(-[^/]*)?\.(css|js))$' || true
)"

if [[ -n "$added" ]]; then
  echo "New release-numbered UI patch assets are not allowed:"
  echo "$added"
  echo "Modify maxdock.css or an existing controller instead."
  exit 1
fi

echo "No new release-numbered UI patch assets detected."
