#!/usr/bin/env python3
"""Render lib/main.dart at each widget-test state to PNGs via Flutter's engine.

Companion to generate_screenshot.py. Where that renders only the initial screen,
this launches tool/render_states.dart, which pumps MyApp, taps the real
"change color" button, and rasterizes the live widget tree after each press:

    test/goldens/state_initial.png        -> blue  (before any press)
    test/goldens/state_after_press_1.png  -> red   (after one press)
    test/goldens/state_after_press_2.png  -> blue  (after two presses)

Same teardown-stall handling as generate_screenshot.py: the harness prints a
"Rendered ... ->" line per image and a final "All states rendered." line; once
we see the latter the PNGs are all on disk, so we kill the process group instead
of waiting out the ~600s flutter_tester teardown stall.

Usage:
    python3 generate_state_screenshots.py
"""
import os
import shutil
import signal
import subprocess
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join("tool", "render_states.dart")
DONE_MARKER = "All states rendered."


def main() -> int:
    flutter = shutil.which("flutter")
    if flutter is None:
        sys.exit("Flutter SDK not found on PATH. Install Flutter to render the app.")

    print("Rendering lib/main.dart toggle states through the Flutter engine ...")
    proc = subprocess.Popen(
        [flutter, "test", HARNESS],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,  # own process group so we can kill the whole tree
    )

    done = False
    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.rstrip()
        if line:
            print(line)
        if DONE_MARKER in line:
            done = True
            # All PNGs are on disk now. Don't wait out the ~600s teardown stall.
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except ProcessLookupError:
                pass
            break

    if not done:
        # Harness exited without finishing (e.g. a compile/test failure):
        # surface its real exit code.
        return proc.wait()

    print("State screenshots written to test/goldens/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
