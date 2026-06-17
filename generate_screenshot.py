#!/usr/bin/env python3
"""Render lib/main.dart to a PNG using Flutter's rendering engine.

This does NOT draw the screen by hand. It launches the app widget (MyApp)
inside Flutter's headless rendering pipeline via `flutter test`, which
rasterizes the live widget tree with the same engine the app uses on a
device, and writes the result to test/goldens/initial_screen.png.

Usage:
    python3 generate_screenshot.py
"""
import os
import shutil
import subprocess
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join("tool", "render_screenshot.dart")
OUTPUT = os.path.join("test", "goldens", "initial_screen.png")


def main() -> int:
    flutter = shutil.which("flutter")
    if flutter is None:
        sys.exit("Flutter SDK not found on PATH. Install Flutter to render the app.")

    print("Rendering lib/main.dart through the Flutter engine ...")
    result = subprocess.run([flutter, "test", HARNESS], cwd=REPO)
    if result.returncode != 0:
        return result.returncode

    print(f"Screenshot written to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
