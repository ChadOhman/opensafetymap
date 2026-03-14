#!/bin/bash
# Stop hook: run full repo tsc --noEmit before session ends
# Blocks session stop (exit 2) if there are TypeScript errors

set -euo pipefail

# Ensure node is in PATH (Windows install location)
export PATH="/c/Program Files/nodejs:$PATH"

cd "$(dirname "$0")/../.."

# Only lint if package.json exists (confirms we're in the right project)
if [[ ! -f "package.json" ]]; then
  exit 0
fi

OUTPUT=$(npx tsc --noEmit 2>&1) || {
  echo "TypeScript errors must be fixed before session ends:" >&2
  echo "$OUTPUT" >&2
  exit 2
}

echo "All TypeScript checks passed." >&2
exit 0
