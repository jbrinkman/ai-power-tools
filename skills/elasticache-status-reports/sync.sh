#!/bin/bash
# Sync elasticache-status-reports skills to the workspace
# Run from the ai-power-tools repo root, or provide the workspace path as an argument.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR"
DST="${1:-/Users/jbrinkman/projects/weekly-reports/amazon-elasticache-agentic/.kiro/skills}"

SKILLS=(new-status-report add-status-label generate-weekly-summary review-status-report finalize-status-report)

for skill in "${SKILLS[@]}"; do
  rm -rf "$DST/$skill"
  cp -R "$SRC/$skill" "$DST/$skill"
  echo "✓ $skill"
done

echo "Synced ${#SKILLS[@]} skills to $DST"
