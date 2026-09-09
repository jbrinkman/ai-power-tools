#!/bin/bash
# Sets up .agents/skills as a symlink to the repo's top-level skills/ directory,
# so Devin CLI's real skill discovery (which scans .agents/skills/<name>/SKILL.md
# relative to its working directory) can find every skill in this repo without
# relocating or duplicating any of them.
#
# This is required for the evals framework to invoke skills the same way a real
# Devin session would (see evals/README.md), instead of splicing SKILL.md text
# directly into a synthetic prompt. It is intentionally NOT committed to git
# (see evals/README.md for why -- symlinks don't survive a default-configured
# Windows git checkout) -- run this script once after cloning, or any time
# after a fresh checkout, before running evals.
#
# Safe to re-run: it's a no-op if the symlink is already set up correctly, and
# it refuses to touch anything unexpected rather than clobbering it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/.agents"
LINK_PATH="$AGENTS_DIR/skills"
TARGET="../skills"

mkdir -p "$AGENTS_DIR"

if [ -L "$LINK_PATH" ]; then
  CURRENT_TARGET="$(readlink "$LINK_PATH")"
  if [ "$CURRENT_TARGET" == "$TARGET" ]; then
    echo "OK: $LINK_PATH already points to $TARGET"
    exit 0
  fi
  echo "ERROR: $LINK_PATH exists as a symlink but points to '$CURRENT_TARGET', not '$TARGET'." >&2
  echo "Remove it manually if this is expected, then re-run this script." >&2
  exit 1
fi

if [ -e "$LINK_PATH" ]; then
  echo "ERROR: $LINK_PATH already exists and is not a symlink (refusing to overwrite)." >&2
  exit 1
fi

ln -s "$TARGET" "$LINK_PATH"
echo "Created symlink: $LINK_PATH -> $TARGET"
