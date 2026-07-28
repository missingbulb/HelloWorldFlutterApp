# hello-world-flutter

This repo's own working rules: the colour-cycle app, the golden set its single
render harness owns, and the process discipline this GPU-less sandbox forces.
Portable Flutter practice lives in the canon `flutter` pack — nothing here repeats
it. This repo's mechanical invariants are checks, not prose (see
[README.md](README.md)); what follows is the judgment that no regex can carry.

## Changing the app colour

The colour cycle is the app's whole behaviour, and changing it is a multi-file
edit. Two of those files are checked: `lib/main.dart` for internal lockstep
(`_cycle` ↔ `_colorNames` ↔ the `ColorScheme.fromSeed` seed ↔ the button's
`foregroundColor`), and `test/widget_test.dart` for cycle coverage — the presses
walk the cycle in order, so a colour no test presses far enough to reach is a
state the green suite never looked at. What remains **yours** in the same change:

- the goldens — regenerate with `python3 build.py` and commit the PNGs. The label
  names the colour, so every state's image really does change.

## Working in this sandbox

- **GitHub MCP tools for CI/PR status, never raw `curl`.** The network policy drops
  unauthenticated calls to `api.github.com`, so a `curl`-based poll silently returns
  nothing at all. `mcp__github__pull_request_read` (method `get_check_runs`) reads
  CI reliably.
- **A mount path in `CLAUDE.md`: reword it away unless a human must open the file
  by hand.** `claudinite-isolation` fires on each one, and only one earns an
  `accept` — the Setup-script paste target, which a person opens before any
  session exists, so no indirection can stand in for it. An incidental reference
  (naming which script a paragraph is about, when the actionable path is already
  spelled in "To set it up") is reworded away instead, so the accept keeps
  excusing exactly one crossing and its reason describes the whole of it.
- **Don't commit `pubspec.lock` churn from a local `flutter pub get`.** The local
  Flutter version differs from CI and resolves slightly different versions; revert
  the lockfile so the feature diff stays clean.
