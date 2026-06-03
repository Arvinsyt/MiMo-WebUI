#!/usr/bin/env bash
set -euo pipefail

errors=0

# Extract env var names from source code (process.env.XXX)
code_vars=$(grep -roh 'process\.env\.\([A-Z_][A-Z_0-9]*\)' server/src/ \
  | sed 's/process\.env\.//' \
  | sort -u)

# Extract env var names from .env.example (lines with KEY=value, skip comments/empty)
example_vars=$(grep -v '^\s*#' .env.example \
  | grep -v '^\s*$' \
  | sed 's/=.*//' \
  | sed 's/^[[:space:]]*//' \
  | sort -u)

# Check: vars in code but missing from .env.example
while IFS= read -r var; do
  if ! grep -qxF "$var" <<< "$example_vars"; then
    echo "ERROR: $var is used in source code but missing from .env.example"
    errors=$((errors + 1))
  fi
done <<< "$code_vars"

# Check: vars in .env.example but not used in code (optional vars warning)
while IFS= read -r var; do
  if ! grep -qxF "$var" <<< "$code_vars"; then
    echo "WARNING: $var is listed in .env.example but not found in source code"
  fi
done <<< "$example_vars"

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors environment variable(s) missing from .env.example"
  exit 1
fi

echo "OK: .env.example is in sync with source code"
