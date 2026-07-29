# hello-world-flutter pack (local)

HelloWorldFlutterApp's own pack — declared by hand as `local/hello-world-flutter`
in `.claudinite-checks.json`. It holds only what is specific to *this* repo: the
colour-cycle app's hand-kept invariants, the golden set owned by
`tool/render_states.dart`, and the single-runner process discipline that this
GPU-less, socket-dropping sandbox forces on `flutter test`. Portable Flutter
practice stays in the canon `flutter` pack, declared alongside it.

## Rules

| Rule | How enforced |
|---|---|
| Colour cycle in lockstep | check `hello-world-flutter/color-cycle-lockstep` (blocking) |
| Golden set declared once | check `hello-world-flutter/golden-set-single-source` (blocking; doc drift advisory) |
| One `flutter test` runner | check `hello-world-flutter/one-flutter-test-runner` (blocking) |
| Mount paths we name still resolve | check `hello-world-flutter/mount-path-exists` (blocking) |
| The pack loads with the mount absent | check `hello-world-flutter/pack-local-imports` (blocking) |
| Changing the app colour | prose ([RULES.md](RULES.md)) |
| Working in this sandbox | prose ([RULES.md](RULES.md)) |

Why that last one matters, since the check now enforces it: the engine `import()`s
these modules at session start, when nothing is guaranteed but this directory —
the shared canon may be unsynced, and with no `package.json` there is no
`node_modules` either. A module that reaches outside the pack throws, and the
pack then declares *no* rules at all, so every check above stops guarding this
repo without a word. That silence is why `finding.mjs` is a local copy of the
engine's helper rather than an import of it.

## Fixtures

`pack.test.mjs` runs under `node --test` — each check fires on a violating fixture,
stays quiet on a clean one, and a final case runs every rule against the real
working tree and asserts zero findings. It is wired into
`.github/workflows/build.yml`, so a violation lands as a red CI run, not just a
session-start warning:

```bash
node --test .claudinite/local/packs/hello-world-flutter/pack.test.mjs
```

Distilled from this repo's own files: `lib/main.dart`, `tool/render_states.dart`,
`flutter_test_runner.py`, `build.py`, `generate_screenshots.py`, `CLAUDE.md`.
