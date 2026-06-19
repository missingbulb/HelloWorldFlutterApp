#!/usr/bin/env python3
"""Shared runner for the repo's `flutter test` invocations.

One place that encodes the three process rules from CLAUDE.md:

  * Fewest processes — callers pass every test/harness path for a SINGLE
    `flutter test` run.
  * Kill immediately — the moment the caller's done-marker appears (all work
    provably finished), kill the whole process group instead of waiting out the
    ~600s GPU-less / dropped-socket teardown stall.
  * Fail fast — a no-output watchdog turns a hang (e.g. an unsettled async/ticker)
    into a quick, explicit failure instead of a silent multi-minute stall.

Killing relies on `start_new_session=True` so the child is its own process group;
do NOT reimplement this with bash `setsid ... &`, which detaches the job and
breaks PID/`$!` tracking (learned the hard way — see CLAUDE.md).
"""
import os
import shutil
import signal
import subprocess
import sys
import threading
import time


def run(test_paths, done_marker, *, extra_args=(), stall_seconds=60, intro=""):
    """Run `flutter test [extra_args] <test_paths>`, streaming output.

    Returns 0 when `done_marker` is seen (success), non-zero otherwise.
    """
    flutter = shutil.which("flutter")
    if flutter is None:
        sys.exit(
            "Flutter SDK not found on PATH. In Claude Code on the web, install it "
            "via the environment setup script (see CLAUDE.md 'Flutter prerequisite')."
        )

    if intro:
        print(intro)

    proc = subprocess.Popen(
        [flutter, "test", *extra_args, *test_paths],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,  # own process group so we can kill the whole tree
    )

    state = {"last_output": time.monotonic(), "finished": False, "stalled": False}

    def killpg(sig):
        try:
            os.killpg(os.getpgid(proc.pid), sig)
        except ProcessLookupError:
            pass

    def watchdog():
        while not state["finished"]:
            if time.monotonic() - state["last_output"] > stall_seconds:
                state["stalled"] = True
                sys.stderr.write(
                    f"\nNo output for {stall_seconds}s — flutter test appears hung. A UI "
                    "test must finish all its work (captures, file writes) before it "
                    "returns; an unsettled async/ticker means it never does. Killing.\n"
                )
                killpg(signal.SIGKILL)
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
        if done_marker in line:
            done = True
            state["finished"] = True
            killpg(signal.SIGTERM)  # work is finished and on disk; skip the stall
            break
        if "Some tests failed" in line:
            state["finished"] = True
            killpg(signal.SIGTERM)
            return 1

    state["finished"] = True
    if not done:
        if state["stalled"]:
            return 1
        return proc.wait() or 1
    return 0
