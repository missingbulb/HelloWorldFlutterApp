#!/bin/bash
# UserPromptSubmit hook: when the user says "LGTM", inject a reminder to run the
# slow-process retrospective documented in CLAUDE.md ("LGTM -> process
# retrospective"). The hook only adds context; the analysis itself is Claude's.
set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // ""' 2>/dev/null || printf '%s' "$input")

if printf '%s' "$prompt" | grep -qiwE 'lgtm'; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"The user said \"LGTM\". Per CLAUDE.md (\"LGTM -> verify, merge, then process retrospective\"): (1) bring the current feature branch up to date with main (pull/merge origin main into it); (2) run the full build (python3 build.py) and confirm ALL tests are green on the updated branch -- if anything fails, STOP and report, do NOT merge; (3) ONLY after tests pass, merge the feature branch into main (fast-forward local main, then push origin main) and confirm the push succeeded; (4) ONLY after the merge is pushed, run the slow-process retrospective for the work just completed and report a short, ranked, MEASURED analysis answering: (a) How many processes ran, and could it be fewer (ideally one)? (b) What took longest -- give wall-clock numbers, separating Dart compile vs test/render execution vs idle waiting? (c) Was each process killed immediately once its work was done? (d) Did every test/render finish only after all work was finished (no dangling async/ticker)? (e) The single highest-leverage change to make it shorter next time."}}
JSON
fi
