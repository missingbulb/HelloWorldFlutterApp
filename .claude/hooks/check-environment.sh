#!/bin/bash
# SessionStart hook: in Claude Code on the web, validate that the environment
# setup script (.claude/environment-setup.sh) has been applied and is current.
# On a problem it injects context telling Claude to alert the user; otherwise it
# is silent. Only runs in the remote/cloud environment (locally the developer
# installs Flutter directly).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

repo="${CLAUDE_PROJECT_DIR:-.}"
expected="$(grep -oE 'ENV_SETUP_VERSION=[0-9]+' "$repo/.claude/environment-setup.sh" 2>/dev/null | head -1 | cut -d= -f2)"
actual="$(cat /opt/claude-env/setup-version 2>/dev/null || true)"

problem=""
if ! command -v flutter >/dev/null 2>&1; then
  problem="Flutter is not installed in this environment"
elif [ -z "$actual" ]; then
  problem="the environment setup script has not been applied (no version flag on disk)"
elif [ -n "$expected" ] && [ "$actual" != "$expected" ]; then
  problem="the environment setup script is out of date (environment is v$actual, repo expects v$expected)"
fi

if [ -n "$problem" ]; then
  msg="Environment setup check failed: $problem. Alert the user: they need to copy the full contents of .claude/environment-setup.sh into the Claude Code Web environment Setup script field (web UI, environment settings), then start a fresh session so the snapshot rebuilds with the prerequisites installed."
  if command -v jq >/dev/null 2>&1; then
    jq -nc --arg ctx "$msg" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
  else
    # Fallback: plain stdout is added to context for SessionStart hooks.
    printf '%s\n' "$msg"
  fi
fi
