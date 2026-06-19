#!/bin/bash
# Claude Code on the web — environment setup script (versioned source of truth).
#
# WHAT: installs the prerequisites a cloud session needs but the image doesn't
# ship (Flutter), and records a version flag the SessionStart hook validates.
#
# HOW TO USE: copy the FULL contents of this file into the environment's
# "Setup script" field (web UI -> environment selector -> edit environment ->
# Setup script). It runs once when an environment is first used; Anthropic then
# snapshots the filesystem, so later sessions already have Flutter on disk.
#
# VERSIONING: bump ENV_SETUP_VERSION whenever this script changes. The
# SessionStart hook (.claude/hooks/check-environment.sh) compares the version
# recorded on disk against this number and alerts if the environment is unset or
# stale, prompting the user to re-paste this script and restart their session.
set -euo pipefail

ENV_SETUP_VERSION=1

# --- Flutter (latest stable channel; matches CI's subosito/flutter-action) ----
if [ ! -x /opt/flutter/bin/flutter ]; then
  git clone --depth 1 -b stable https://github.com/flutter/flutter.git /opt/flutter
fi
ln -sf /opt/flutter/bin/flutter /usr/local/bin/flutter
ln -sf /opt/flutter/bin/dart /usr/local/bin/dart
git config --global --add safe.directory /opt/flutter || true
flutter --version || true
flutter precache || true   # warm host engine artifacts so the first test is fast

# --- Record the environment version so the SessionStart hook can validate it ---
mkdir -p /opt/claude-env
echo "$ENV_SETUP_VERSION" > /opt/claude-env/setup-version
