#!/usr/bin/env python3
"""Generate ALL UI golden images in a SINGLE Flutter process, then kill it.

Renders lib/main.dart at every UI state through Flutter's engine (no hand-drawing)
by launching tool/render_states.dart once via `flutter test`, writing every PNG in
test/goldens/. The image set is declared in ONE place — `_expectedImages` in
tool/render_states.dart, which is also that run's completion guard — so this
docstring deliberately does not re-list it (it drifted when it did); CLAUDE.md's
golden table is the human-readable copy, and the
hello-world-flutter/golden-set-single-source check keeps the two honest.

This is the images-only path. To also run the widget tests in the same process,
use `python3 build.py`. The shared runner (flutter_test_runner.py) enforces the
fewest-processes / kill-immediately / fail-fast rules documented in CLAUDE.md.

Usage:
    python3 generate_screenshots.py
"""
from flutter_test_runner import run


def main() -> int:
    rc = run(
        ["tool/render_states.dart"],
        "All UI images rendered.",
        intro="Rendering all UI states through the Flutter engine (single process) ...",
    )
    if rc == 0:
        print("All screenshots written to test/goldens/")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
