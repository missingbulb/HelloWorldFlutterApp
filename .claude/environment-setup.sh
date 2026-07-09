#!/usr/bin/env bash
# GENERIC Claudinite cloud environment setup — identical across projects.
# Paste the FULL body into the Claude Code Web environment's "Setup script"
# field (environment settings). Runs once when the environment is created; the
# filesystem is snapshotted and reused, so installs aren't repaid per session.
# Per-toolchain install logic + versions live in Claudinite packs (packs/env.mjs,
# driven by this repo's .claudinite-checks.json), NOT here.
set -euo pipefail

# The Setup script runs as root starting in the checkout's PARENT dir. cd into
# the checkout — the one dir under here that mounts Claudinite.
root="$(dirname "$(find "$PWD" -maxdepth 2 -name .claudinite-checks.json 2>/dev/null | head -n1)")"
cd "$root"

# 1. Prime the Claudinite corpus so the pack env declarations + env.mjs exist
#    before the first session (the SessionStart sync keeps it current after).
bash .claude/hooks/sync-claudinite.sh || true

# 2. Generated-file merge hygiene — universal, cheap, harmless where unused: the
#    `ours` driver .gitattributes maps GENERATED files to, plus conflict-replay.
git config merge.ours.driver true
git config rerere.enabled true

# 3. Install every active pack's declared environment requirement (Flutter SDK,
#    node deps, …) and stamp the version flag the SessionStart check validates.
node .claudinite/packs/env.mjs install
