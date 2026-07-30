# hello-world-flutter

This repo's own working rules: the colour-cycle app, the golden set its single
render harness owns, and the process discipline this GPU-less sandbox forces.
Portable Flutter practice lives in the canon `flutter` pack — nothing here repeats
it. This repo's mechanical invariants are checks, not prose (see
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

- **A mount path in `CLAUDE.md`: reword it away unless a human must open the file
  by hand.** `claudinite-isolation` fires on each one, and only one earns an
  `accept` — the Setup-script paste target, which a person opens before any
  session exists, so no indirection can stand in for it. An incidental reference
  (naming which script a paragraph is about, when the actionable path is already
  spelled in "To set it up") is reworded away instead, so the accept keeps
  excusing exactly one crossing and its reason describes the whole of it.
- **A verification-only build dirties the lockfile *and* every golden — revert
  both.** `python3 build.py` on an otherwise untouched tree comes back with
  `pubspec.lock` and all five `test/goldens/*.png` modified: the local Flutter
  differs from CI's, so it resolves slightly different package versions and
  re-encodes the PNGs (same byte count, different bytes). CLAUDE.md's
  "regenerate and commit the PNGs" is for when the app's rendering actually
  changed; on a docs- or pack-only branch that churn is toolchain noise, so
  `git checkout -- pubspec.lock test/goldens/` before committing and keep the
  diff to the files the change is about.
- **Don't land a `.claudinite-checks.json` key the vendored engine doesn't know
  yet.** Settings validation is an allowlist — `CONFIG_KEYS` in the vendored
  checks engine — so a key canon has only just added reads here as a blocking
  `unknown setting "…"` on every session, until baselining re-vendors the mount.
  Grep `CONFIG_KEYS` in the vendored engine first, and land the key only once
  the mount carries it. Dormancy sharpens this: `"dormant": true` stops every
  scheduled task, baselining included, so the mount falls behind by design and
  the gap will not close by waiting.
