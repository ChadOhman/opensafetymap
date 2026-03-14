#!/bin/bash
# PostToolUse hook: run tsc --noEmit after editing TypeScript files
# Reads hook input from stdin, checks if edited file is .ts/.tsx

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only lint after Edit or Write on TypeScript files
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Ensure node is in PATH (Windows install location)
export PATH="/c/Program Files/nodejs:$PATH"

cd "$(dirname "$0")/../.."

OUTPUT=$(npx tsc --noEmit 2>&1) || {
  echo "TypeScript errors found after editing $FILE_PATH:" >&2
  echo "$OUTPUT" >&2
  exit 1
}

exit 0
