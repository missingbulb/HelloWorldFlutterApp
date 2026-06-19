#!/usr/bin/env python3
"""Generate ALL UI golden images in a SINGLE Flutter process, then kill it.

Renders lib/main.dart at every UI state through Flutter's engine (no hand-drawing)
by launching tool/render_states.dart once via `flutter test`, writing:

    test/goldens/initial_screen.png        blue  (legacy name, initial screen)
    test/goldens/state_initial.png         blue  (before any press)
    test/goldens/state_after_press_1.png   red   (after one press)
    test/goldens/state_after_press_2.png   blue  (after two presses)

This is the images-only path. To also run the widget tests in the same process,
use `python3 build.py`. The shared runner (flutter_test_runner.py) enforces the
fewest-processes / kill-immediately / fail-fast rules documented in CLAUDE.md.

Usage:
    python3 generate_screenshots.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flutter_test_runner import run  # noqa: E402


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
