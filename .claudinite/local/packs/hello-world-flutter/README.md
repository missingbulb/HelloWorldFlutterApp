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
| Changing the app colour | prose ([RULES.md](RULES.md)) |
| Working in this sandbox | prose ([RULES.md](RULES.md)) |

Every rule module imports nothing outside this directory (only `finding.mjs`), so
the pack loads with the shared mount absent.

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
