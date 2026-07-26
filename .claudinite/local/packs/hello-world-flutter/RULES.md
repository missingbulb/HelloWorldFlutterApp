# hello-world-flutter

This repo's own working rules: the colour-cycle app, the golden set its single
render harness owns, and the process discipline this GPU-less sandbox forces.
Portable Flutter practice lives in the canon `flutter` pack — nothing here repeats
it. Three of this repo's invariants are checks, not prose (see
[README.md](README.md)); what follows is the judgment that no regex can carry.

## Changing the app colour

The colour cycle is the app's whole behaviour, and changing it is a multi-file
edit. `lib/main.dart` is checked for internal lockstep (`_cycle` ↔ `_colorNames`
↔ the `ColorScheme.fromSeed` seed ↔ the button's `foregroundColor`), so the parts
that remain **yours** to update in the same change are:

- `test/widget_test.dart` — the per-press assertions: `expect(scaffold.backgroundColor, Colors.X)`
  and the label the press produces, `find.text('hello world <colour>')`. There is
  one test per press; a longer cycle needs another one.
- the goldens — regenerate with `python3 build.py` and commit the PNGs. The label
  names the colour, so every state's image really does change.

## Working in this sandbox

- **GitHub MCP tools for CI/PR status, never raw `curl`.** The network policy drops
  unauthenticated calls to `api.github.com`, so a `curl`-based poll silently returns
  nothing at all. `mcp__github__pull_request_read` (method `get_check_runs`) reads
  CI reliably.
- **Don't commit `pubspec.lock` churn from a local `flutter pub get`.** The local
  Flutter version differs from CI and resolves slightly different versions; revert
  the lockfile so the feature diff stays clean.
