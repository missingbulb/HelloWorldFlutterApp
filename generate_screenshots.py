#!/usr/bin/env python3
"""Generate ALL UI golden images in a SINGLE Flutter process, then kill it.

This renders lib/main.dart at every UI state through Flutter's engine (no
hand-drawing) by launching tool/render_states.dart once via `flutter test`,
writing:

    test/goldens/initial_screen.png        blue  (legacy name, initial screen)
    test/goldens/state_initial.png         blue  (before any press)
    test/goldens/state_after_press_1.png   red   (after one press)
    test/goldens/state_after_press_2.png   blue  (after two presses)

Three rules are enforced here and in the harness (see CLAUDE.md):

  * Fewest processes  — ONE `flutter test` run produces every image. There is no
    per-image process and no separate "initial screenshot" run.

  * Kill immediately  — the harness prints DONE_MARKER only after it has written
    and verified every PNG. The moment we see it we kill the whole process group,
    instead of waiting out the ~600s GPU-less / dropped-socket teardown stall.
    The files are already on disk at that point.

  * Synchronous completion / fail fast — because DONE_MARKER means "all work
    finished", its absence means the work did not finish. A no-output watchdog
    turns a hang (e.g. an unsettled async/ticker) into a fast, explicit failure
    rather than a silent multi-minute stall.

Usage:
    python3 generate_screenshots.py
"""
import os
import shutil
import signal
import subprocess
import sys
import threading
import time

REPO = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join("tool", "render_states.dart")
DONE_MARKER = "All UI images rendered."
STALL_SECONDS = 60  # no new output for this long -> assume a hang, kill and fail


def main() -> int:
    flutter = shutil.which("flutter")
    if flutter is None:
        sys.exit("Flutter SDK not found on PATH. Install Flutter to render the app.")

    print("Rendering all UI states through the Flutter engine (single process) ...")
    proc = subprocess.Popen(
        [flutter, "test", HARNESS],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,  # own process group so we can kill the whole tree
    )

    state = {"last_output": time.monotonic(), "finished": False, "stalled": False}

    def _killpg(sig: int) -> None:
        try:
            os.killpg(os.getpgid(proc.pid), sig)
        except ProcessLookupError:
            pass

    def watchdog() -> None:
        while not state["finished"]:
            if time.monotonic() - state["last_output"] > STALL_SECONDS:
                state["stalled"] = True
                sys.stderr.write(
                    f"\nNo output for {STALL_SECONDS}s — render appears hung. A UI "
                    "test must finish all its work (captures, file writes) before it "
                    "returns; an unsettled async/ticker means it never does. Killing.\n"
                )
                _killpg(signal.SIGKILL)
                return
            time.sleep(1)

    threading.Thread(target=watchdog, daemon=True).start()

    done = False
    assert proc.stdout is not None
    for line in proc.stdout:
        state["last_output"] = time.monotonic()
        line = line.rstrip()
        if line:
            print(line)
        if DONE_MARKER in line:
            done = True
            state["finished"] = True
            # Every PNG is on disk and verified now. Don't wait out the stall.
            _killpg(signal.SIGTERM)
            break

    state["finished"] = True
    if not done:
        if state["stalled"]:
            return 1
        # Harness exited without the DONE marker (compile/test failure): surface it.
        return proc.wait() or 1

    print("All screenshots written to test/goldens/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
