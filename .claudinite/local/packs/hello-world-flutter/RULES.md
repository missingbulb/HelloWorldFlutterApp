# hello-world-flutter

This repo's own working rules: the colour-cycle app, the golden set its single
render harness owns, and the process discipline this GPU-less sandbox forces.
Portable Flutter practice lives in the canon `flutter` pack — nothing here repeats
it. This repo's mechanical invariants are checks, not prose (see
[README.md](README.md)); what follows is the judgment that no regex can carry.

## Rules capture work procedure, never product requirements

A rule — prose here, or a check in this pack — describes **how we work on this
repo**: the order of a multi-file edit, which process artifacts must stay in step,
what this sandbox forces on `flutter test`. It must never encode **what the app
does**: the colour cycle's membership, the greeting's wording, a screen's layout.
Those are the product, and the product is specified in the repo's `CLAUDE.md` and
enforced by `test/widget_test.dart` and the goldens — the artifacts a product
change is *supposed* to rewrite.

The distinction is what happens on a legitimate product change. Rename the label
from "hello world red" to "hi there red" and the widget test fails — correctly; it
is the spec, and you update it in the same edit. A check that had *also*
hard-coded `'hello world <colour>'` fails too, but says nothing true: no procedure
was violated, so the finding is noise, and clearing it means editing the rule
engine to match the app. That is the tell — **if a rule would have to change every
time the product changes, it was never a rule.** It also pays twice, since the
widget test already caught anything real.

A drift guard is still procedure and still belongs: `color-cycle-lockstep` does
not say the cycle is blue → red → purple, it says that *whatever* the cycle is,
the parallel lists and the theme seed must agree — one fact kept in one place,
which survives any product change.

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
- **A local `flutter pub get` rewrites `pubspec.lock`:** the local Flutter version
  differs from CI and resolves slightly different versions.
- **Every `python3 build.py` also dirties `test/goldens/` — revert it unless the
  change is an app change.** The build rewrites all five PNGs, and the local
  Flutter renders bytes that differ from the committed ones even when `lib/` and
  `tool/` are untouched, so a docs- or pack-only branch ends up carrying five
  modified images that have nothing to do with it. Expect it, don't diagnose it:
  after any build on such a branch, `git checkout -- pubspec.lock test/goldens/`
  before committing or merging. Committed goldens are regenerated on purpose only
  when the rendered app really changed (see "Changing the app colour" above).
- **Don't land a `.claudinite-checks.json` key the vendored engine doesn't know
  yet.** Settings validation is an allowlist — `CONFIG_KEYS` in the vendored
  checks engine — so a key canon has only just added reads here as a blocking
  `unknown setting "…"` on every session, until baselining re-vendors the mount.
  Grep `CONFIG_KEYS` in the vendored engine first, and land the key only once
  the mount carries it. Dormancy sharpens this: `"dormant": true` stops every
  scheduled task, baselining included, so the mount falls behind by design and
  the gap will not close by waiting.
