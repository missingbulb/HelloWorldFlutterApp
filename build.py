#!/usr/bin/env python3
"""Canonical full build: compile + ALL widget tests + ALL UI images in ONE process.

This is the fewest-processes, fastest path (see CLAUDE.md "Render/test process
rules" and "Build speed notes"): a single `flutter test` run compiles once, runs
the widget tests, and regenerates every golden in test/goldens/ — then is killed
the instant it prints `All tests passed!`, skipping the ~600s teardown stall.

`--concurrency=1` keeps it to one test runner at a time (truly one process).

Usage:
    python3 build.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flutter_test_runner import run  # noqa: E402


def main() -> int:
    rc = run(
        ["test/widget_test.dart", "tool/render_states.dart"],
        "All tests passed!",
        extra_args=["--concurrency=1"],
        intro="Building: compile + widget tests + all UI images (one process) ...",
    )
    if rc == 0:
        print("Build OK — tests passed and every UI image written to test/goldens/")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
