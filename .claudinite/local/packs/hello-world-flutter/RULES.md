# hello-world-flutter

This repo's own working rules: the colour-cycle app, the golden set its single
render harness owns, and the process discipline this GPU-less sandbox forces.
Portable Flutter practice lives in the canon `flutter` pack — nothing here repeats
it. Four of this repo's invariants are checks, not prose (see
[README.md](README.md)); what follows is the judgment that no regex can carry.

## Changing the app colour

The colour cycle is the app's whole behaviour, and changing it is a multi-file
edit — but the mechanical half is checked, not remembered: `lib/main.dart` for
internal lockstep, and `cycle-coverage` for the rest of the repo keeping up
(every colour in the cycle asserted by a press-test in `test/widget_test.dart`,
and rendered as a `state_after_press_N` golden).

What stays **yours** is the half no scan can see: regenerate the goldens with
`python3 build.py` and commit the PNGs. A check knows when a golden is *missing*;
only you know when its pixels are *stale* — and because the label names the
colour, every state's image really does change.

## Working in this sandbox

- **GitHub MCP tools for CI/PR status, never raw `curl`.** The network policy drops
  unauthenticated calls to `api.github.com`, so a `curl`-based poll silently returns
  nothing at all. `mcp__github__pull_request_read` (method `get_check_runs`) reads
  CI reliably.
- **Don't commit `pubspec.lock` churn from a local `flutter pub get`.** The local
  Flutter version differs from CI and resolves slightly different versions; revert
  the lockfile so the feature diff stays clean.
