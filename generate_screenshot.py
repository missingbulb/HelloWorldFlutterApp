#!/usr/bin/env python3
"""Render lib/main.dart to a PNG using Flutter's rendering engine.

This does NOT draw the screen by hand. It launches the app widget (MyApp)
inside Flutter's headless rendering pipeline via `flutter test`, which
rasterizes the live widget tree with the same engine the app uses on a
device, and writes the result to test/goldens/initial_screen.png.

Note on speed: in this sandboxed, GPU-less environment the actual compile +
render + file write completes in a few seconds, but `flutter test` then
stalls for ~600s in teardown (the flutter_tester subprocess can't shut down
cleanly when outbound sockets are dropped by the network policy). Since the
PNG is already on disk the moment the harness prints its "Rendered ... ->"
line, we stream the output and terminate the process as soon as we see it,
turning a ~10-minute command into a ~5-second one.

Usage:
    python3 generate_screenshot.py
"""
import os
import shutil
import signal
import subprocess
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join("tool", "render_screenshot.dart")
OUTPUT = os.path.join("test", "goldens", "initial_screen.png")
DONE_MARKER = "Rendered "


def main() -> int:
    flutter = shutil.which("flutter")
    if flutter is None:
        sys.exit("Flutter SDK not found on PATH. Install Flutter to render the app.")

    print("Rendering lib/main.dart through the Flutter engine ...")
    proc = subprocess.Popen(
        [flutter, "test", HARNESS],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,  # own process group so we can kill the whole tree
    )

    rendered = False
    assert proc.stdout is not None
    for line in proc.stdout:
        if DONE_MARKER in line:
            rendered = True
            print(line.rstrip())
            # The PNG is on disk now. Don't wait out the ~600s teardown stall.
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except ProcessLookupError:
                pass
            break

    if not rendered:
        # Harness exited without rendering (e.g. a compile/test failure):
        # surface its real exit code.
        return proc.wait()

    print(f"Screenshot written to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
