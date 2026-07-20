#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

status=0
checked=0

while IFS= read -r -d '' path; do
  name="${path#./}"
  case "$name" in
    *.html|*.js|*.css|*.sql|*.png|README.txt|SUPABASE-LICENSE.txt|DEPLOYMENT_*.txt|*_VALIDATION.txt)
      if [[ ! -f "db04/$name" ]]; then
        printf 'Missing db04 mirror: %s\n' "$name" >&2
        status=1
        continue
      fi
      checked=$((checked + 1))
      if ! cmp -s "$name" "db04/$name"; then
        printf 'Mirror differs: %s <-> db04/%s\n' "$name" "$name" >&2
        status=1
      fi
      ;;
  esac
done < <(find . -maxdepth 1 -type f -print0)

if (( status != 0 )); then
  exit "$status"
fi

printf 'Root/db04 parity verified for %d mirrored release files.\n' "$checked"
