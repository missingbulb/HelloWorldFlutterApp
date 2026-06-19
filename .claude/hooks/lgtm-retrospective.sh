#!/bin/bash
# UserPromptSubmit hook: when the user says "LGTM", inject a reminder to run the
# slow-process retrospective documented in CLAUDE.md ("LGTM -> process
# retrospective"). The hook only adds context; the analysis itself is Claude's.
set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // ""' 2>/dev/null || printf '%s' "$input")

if printf '%s' "$prompt" | grep -qiwE 'lgtm'; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"The user said \"LGTM\". Per CLAUDE.md (\"LGTM -> process retrospective\"), run the slow-process retrospective for the work just completed and report a short, ranked, MEASURED analysis answering: (1) How many processes ran, and could it be fewer (ideally one)? (2) What took longest -- give wall-clock numbers, separating Dart compile vs test/render execution vs idle waiting? (3) Was each process killed immediately once its work was done? (4) Did every test/render finish only after all work was finished (no dangling async/ticker)? (5) The single highest-leverage change to make it shorter next time."}}
JSON
fi
