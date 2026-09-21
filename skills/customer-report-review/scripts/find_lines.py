#!/usr/bin/env python3
"""
find_lines.py — locate the exact 1-indexed line number(s) of one or more
substrings inside a report file, so GitHub review comments land on the
correct line every time.

Why this exists: weekly status reports mix tables, blank lines between
sections, and HTML/markdown that don't line up the way you'd count by eye.
Manually counting lines is exactly the kind of task a human (or a model)
gets subtly wrong — off by one blank line and every comment below it is
misplaced. This script removes the guesswork.

Usage:
    python3 scripts/find_lines.py <file> "<search string 1>" ["<search string 2>" ...]

Example:
    python3 scripts/find_lines.py report.md \\
        "Add per-node retry for updating cluster config" \\
        "new Affinity engineer"

Output: for each search string, the 1-indexed line number of every line
that contains it. If a string matches zero times or more than once, that
is flagged explicitly — an ambiguous or missing match means don't trust a
guess, go re-read the file (or narrow the search string).

Notes:
- Matching is plain substring (not regex), case-sensitive by default, so it
  works with markdown/HTML fragments as-is without escaping.
- For a brand-new file in a PR (pure addition), the diff hunk header
  (e.g. `@@ -0,0 +1,84 @@`) means diff line numbers == file line numbers.
  For a *modified* file, don't assume this — run this script against the
  actual new file content (e.g. via a GitHub "get file contents at ref"
  call for the PR's head commit), not the diff patch, since added-line
  numbers in a diff hunk do not equal absolute file line numbers once a
  file has any pre-existing (unchanged/context) lines above them.
"""

import sys


def find_lines(path: str, needle: str, case_sensitive: bool = True) -> list[int]:
    matches = []
    with open(path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, start=1):
            haystack = line if case_sensitive else line.lower()
            target = needle if case_sensitive else needle.lower()
            if target in haystack:
                matches.append(lineno)
    return matches


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 1

    path = argv[1]
    needles = argv[2:]

    try:
        open(path, "r", encoding="utf-8").close()
    except OSError as exc:
        print(f"[ERROR] Can't read {path!r}: {exc}")
        return 1

    exit_code = 0
    for needle in needles:
        lines = find_lines(path, needle)
        if not lines:
            print(f"[NO MATCH]      {needle!r} — not found. Re-check the exact text (whitespace, punctuation).")
            exit_code = 1
        elif len(lines) > 1:
            print(f"[AMBIGUOUS x{len(lines)}] {needle!r} -> lines {lines} — narrow the search string to pick one.")
            exit_code = 1
        else:
            print(f"line {lines[0]:>4}  ->  {needle!r}")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
