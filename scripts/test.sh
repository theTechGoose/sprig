#!/bin/bash
set -e

# Project root is parent of scripts/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TRANSPILER_DIR="$PROJECT_ROOT/transpiler"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/test.sh <fixture-name>"
  echo "Example: ./scripts/test.sh example-app"
  echo ""
  echo "Available fixtures:"
  ls "$FIXTURES_DIR"
  exit 1
fi

FIXTURE_NAME="$1"
SOURCE_DIR="$FIXTURES_DIR/$FIXTURE_NAME"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Fixture '$FIXTURE_NAME' not found in $FIXTURES_DIR"
  exit 1
fi

# Output dir is sibling to fixture with -dist suffix
OUT_DIR="$FIXTURES_DIR/${FIXTURE_NAME}-dist"

echo "=== Cleaning previous output ==="
rm -rf "$OUT_DIR"

# Remove -dist entries from root deno.json workspace using sed (no Deno dependency)
DENO_JSON="$PROJECT_ROOT/deno.json"
if [ -f "$DENO_JSON" ]; then
  # Remove lines containing -dist from workspace array
  sed -i.bak '/-dist/d' "$DENO_JSON"
  # Clean up trailing commas that might be left
  sed -i.bak 's/,\([[:space:]]*\]\)/\1/g' "$DENO_JSON"
  rm -f "$DENO_JSON.bak"
fi

echo ""
echo "=== Transpiling $FIXTURE_NAME ==="
cd "$TRANSPILER_DIR"
deno run -A mod.ts "$SOURCE_DIR"

# Add the -dist folder to the workspace
echo ""
echo "=== Adding ${FIXTURE_NAME}-dist to workspace ==="
cd "$PROJECT_ROOT"
# Use sed to add the -dist entry before the closing bracket of workspace array
sed -i.bak "s|\(\"./fixtures/$FIXTURE_NAME\",*\)|\1\n    \"./fixtures/${FIXTURE_NAME}-dist\",|" "$DENO_JSON"
# Clean up trailing commas before ]
sed -i.bak 's/,\([[:space:]]*\]\)/\1/g' "$DENO_JSON"
rm -f "$DENO_JSON.bak"

echo ""
echo "=== Installing dependencies ==="
cd "$OUT_DIR"
deno install

echo ""
echo "=== Starting dev server ==="
# Start server and wait for Vite to be ready before opening browser
deno task dev 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == *"ready in"* ]]; then
    # Vite is ready, open browser at root
    (sleep 1 && open "http://localhost:5173/") &
  fi
done
