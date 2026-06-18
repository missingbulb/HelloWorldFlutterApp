# HelloWorldFlutterApp

A Flutter app with a colored background, "hello world" text, and a "hi!" button.
Screenshot generation is driven by Flutter's rendering engine — no hand-drawing.

## Generating the screenshot

```bash
python3 generate_screenshot.py
```

This renders `lib/main.dart` through Flutter's headless engine and writes the result
to `test/goldens/initial_screen.png`. Takes ~4–30s depending on whether Dart needs
to recompile (source changed → ~30s; no change → ~4s).

## How the render pipeline works

`generate_screenshot.py` launches `tool/render_screenshot.dart` via `flutter test`.
That harness pumps the real `MyApp` widget inside Flutter's test binding, wraps it
in a `RepaintBoundary`, and rasterizes it with `RenderRepaintBoundary.toImage()`.
The pixels come entirely from the Flutter engine (Skia, software-rendered — no GPU
in this environment).

## The 600s teardown stall — and the fix

**Symptom:** `flutter test` takes ~10 minutes even though the render finishes in
seconds. `real ~600s` but `user+sys ~6s` — the process is blocked, not working.

**Cause:** This sandbox has no GPU and its network policy silently drops outbound
sockets. After the test harness finishes, `flutter_tester` hangs waiting on a socket
that will never close, and `flutter test` waits out a hardcoded 600s timeout.

**Fix:** `generate_screenshot.py` streams the harness output and kills the entire
process group (`os.killpg`) the moment it sees the `Rendered … ->` line. The PNG
is already on disk at that point. This reduces wall-clock time from ~10 minutes to
~4 seconds.

If the stall reappears, diagnose with:
```bash
{ time flutter test tool/render_screenshot.dart; } 2>&1
# real ~600s but user+sys ~6s → teardown stall, fix is already in generate_screenshot.py
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
