# HelloWorldFlutterApp

A Flutter app with a colored background, "hello world" text, and a "change color"
button that toggles the background between blue and red. Once pressed, the label
names the current colour ("hello world red" / "hello world blue").
Screenshot generation is driven by Flutter's rendering engine — no hand-drawing.

## Generating the screenshots

```bash
python3 generate_screenshots.py
```

This renders `lib/main.dart` through Flutter's headless engine and writes **every**
UI golden in one run:

| File | State |
|------|-------|
| `test/goldens/initial_screen.png` | blue (initial; legacy name) |
| `test/goldens/state_initial.png` | blue (before any press) |
| `test/goldens/state_after_press_1.png` | red (after one press) |
| `test/goldens/state_after_press_2.png` | blue (after two presses) |

Takes ~4–30s depending on whether Dart needs to recompile (source changed → ~30s;
no change → ~4s).

## How the render pipeline works

`generate_screenshots.py` launches `tool/render_states.dart` **once** via
`flutter test`. That harness pumps the real `MyApp` widget inside Flutter's test
binding (wrapped in a `RepaintBoundary`), taps the real "change color" button, and
rasterizes the live tree with `RenderRepaintBoundary.toImage()` after each press.
The pixels come entirely from the Flutter engine (Skia, software-rendered — no GPU
in this environment).

## Render/test process rules (keep these intact)

These three rules exist because this GPU-less, dropped-socket sandbox makes
`flutter test` hang in teardown (see below). They keep generation fast and hangs
loud.

1. **Fewest processes.** All UI images come from one `flutter test` run — never
   one process per image, never a separate "initial screenshot" run. Likewise the
   build + widget tests are a single `flutter test` process. Fewer processes means
   fewer things to stall and kill.

2. **Kill immediately when the work is done.** The runner streams output and kills
   the whole process group (`os.killpg`) the instant it sees the done marker,
   rather than waiting out the ~600s teardown stall. The same pattern applies to a
   local `flutter test`: it is safe to kill once you see `All tests passed!`.

3. **Synchronous completion — the test finishes only when all work is finished.**
   `tool/render_states.dart` awaits every capture, writes each PNG synchronously,
   and runs a final guard that verifies every expected file exists before printing
   `All UI images rendered.`. So the done marker provably means "all work done",
   and its absence means the work did not finish. The runner's no-output watchdog
   turns such a hang (e.g. an unsettled async/ticker, or `toImage()` used outside
   `tester.runAsync()`) into a fast, explicit failure instead of a silent stall.

   Corollary: captures of an interactive frame **must** run inside
   `tester.runAsync()`. Once a ticker is live (the button's ink ripple),
   `toImage()`/`toByteData()` are driven by the engine's real async worker, which
   the fake-async test clock never pumps — awaiting them outside `runAsync()`
   deadlocks.

## The 600s teardown stall — and the fix

**Symptom:** `flutter test` takes ~10 minutes even though the render finishes in
seconds. `real ~600s` but `user+sys ~6s` — the process is blocked, not working.

**Cause:** This sandbox has no GPU and its network policy silently drops outbound
sockets. After the test harness finishes, `flutter_tester` hangs waiting on a socket
that will never close, and `flutter test` waits out a hardcoded 600s timeout.

**Fix:** `generate_screenshots.py` streams the harness output and kills the entire
process group (`os.killpg`) the moment it sees the `All UI images rendered.` marker
(printed only after every PNG is written and verified). The files are already on
disk at that point. This reduces wall-clock time from ~10 minutes to ~4 seconds.
A no-output watchdog in the same script kills and fails fast if the run stalls.

If the stall reappears, diagnose with:
```bash
{ time flutter test tool/render_states.dart; } 2>&1
# real ~600s but user+sys ~6s → teardown stall, fix is already in generate_screenshots.py
# real ~30s, user+sys ~30s  → Dart compile (source changed, normal)
# real ~4s,  user+sys ~4s   → warm cache hit, all good
```

## Font rendering in golden tests

Flutter's test renderer uses a stub font ("Ahem") with no glyphs by default. Text
renders as blank colored rectangles unless real fonts are explicitly loaded.

**Fix applied in this repo:**

1. Roboto font files are bundled in `fonts/` and declared in `pubspec.yaml`.
2. The test harness loads them via `FontLoader` before pumping any widgets.
3. `ThemeData` has `fontFamily: 'Roboto'` to cover most widgets.
4. `ElevatedButton.styleFrom`'s `textStyle` needs `fontFamily: 'Roboto'` set
   **explicitly** — the button merges its text style without inheriting `fontFamily`
   from the theme, so it falls back to Ahem if not pinned directly.

**General rule:** if a widget's text style comes from `ButtonStyle`, `TextStyle`
passed directly to a widget, or any `styleFrom` helper, always set
`fontFamily: 'Roboto'` on it explicitly in addition to the theme-level setting.

## Changing the app color

Three places in `lib/main.dart` must all be updated together:
- `ColorScheme.fromSeed(seedColor: Colors.X)`
- `Scaffold(backgroundColor: Colors.X)`
- `ElevatedButton.styleFrom(foregroundColor: Colors.X)`

And the assertion in `test/widget_test.dart`:
- `expect(scaffold.backgroundColor, Colors.X)`
