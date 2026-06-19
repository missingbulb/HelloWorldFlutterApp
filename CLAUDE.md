# HelloWorldFlutterApp

A Flutter app with a colored background, "hello world" text, and a "change color"
button that toggles the background between blue and red. Once pressed, the label
names the current colour ("hello world red" / "hello world blue").
Screenshot generation is driven by Flutter's rendering engine — no hand-drawing.

## Building & generating screenshots

```bash
python3 build.py                 # canonical: compile + ALL tests + ALL images, one process
python3 generate_screenshots.py  # images only (same single-process rules)
```

`build.py` is the canonical full build: a **single** `flutter test` process
(`--concurrency=1`) that compiles, runs **every** widget test, and regenerates
**every** UI golden, then is killed the instant it prints `All tests passed!`
(skipping the ~600s teardown stall). Prefer it for "run everything" — generating
the goldens alongside the tests costs only ~2–3s over the tests alone.

Both write every golden in one run:

| File | State |
|------|-------|
| `test/goldens/initial_screen.png` | blue (initial; legacy name) |
| `test/goldens/state_initial.png` | blue (before any press) |
| `test/goldens/state_after_press_1.png` | red (after one press) |
| `test/goldens/state_after_press_2.png` | blue (after two presses) |

Both scripts share `flutter_test_runner.py`, which encodes the process rules below.

### Build speed (measured) — and how to keep it fast

| Situation | Time | Why |
|-----------|------|-----|
| Warm cache, no source change | ~5s | VM boot + run only |
| After a source edit | ~11s | **incremental** Dart recompile (~7s) + run |
| Cold / first build | ~27s + Flutter install | **full** compile + one-time SDK download |

The variable cost is almost entirely Dart compilation. To keep builds short:
- **One process, not two.** `build.py` compiles once; two separate `flutter test`
  runs pay two VM boots (~6.3s vs ~4.7s warm — measured).
- **Never `flutter clean`.** The warm `.dart_tool` cache is what turns a 27s full
  compile into a ~7s incremental one.
- **Batch edits, run once.** Every save triggers a recompile; group related edits
  before building.
- **Pre-install Flutter once** (see "Flutter prerequisite" below) so the SDK
  download is off the critical path.

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

### Capturing an interactive frame — two more gotchas

- **Don't `pumpAndSettle()` after tapping the button.** The ink ripple keeps
  scheduling frames, so `pumpAndSettle()` never returns. Use fixed-duration pumps
  instead: `await tester.pump(const Duration(seconds: 1))` settles the ripple and
  the colour animation deterministically. (Plain widget tests that only *assert*
  may still use `pumpAndSettle()` — the hang only bites when you then `toImage()`.)
- **Pump twice after a tap, or the label colour lags one frame.** The button
  animates its foreground colour (~200ms). A single pump paints the very first
  frame *before* the implicit animation advances, so the label shows the *old*
  colour. Do `await tester.pump();` (apply setState + start the animation) then
  `await tester.pump(const Duration(seconds: 1));` (let it finish) before capturing.

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

Places in `lib/main.dart` that must stay in sync:
- `ColorScheme.fromSeed(seedColor: Colors.X)`
- the initial `_backgroundColor` and the toggle in `_toggleColor()`
- the button's `foregroundColor` (it follows `_backgroundColor`)
- `_toggleColor()` also sets `_label` to `'hello world <colour>'` after a press

And the assertions in `test/widget_test.dart`:
- `expect(scaffold.backgroundColor, Colors.X)`
- the after-press label text, e.g. `find.text('hello world red')`

## Working in this sandbox (process notes)

- **Use the GitHub MCP tools for CI/PR status, not raw `curl`.** The network
  policy drops unauthenticated calls to `api.github.com`, so a `curl`-based poll
  silently returns nothing. `mcp__github__pull_request_read` (method
  `get_check_runs`) is the reliable way to read CI status.
- **Kill `flutter test` from Python with `start_new_session=True`** (as
  `flutter_test_runner.py` does), then `os.killpg`. Do **not** background it with
  bash `setsid cmd &` — that detaches the job and breaks `$!`/`kill -0` tracking,
  so you can't tell whether it passed or reap it.
- **Don't commit `pubspec.lock` churn from a local `flutter pub get`.** The local
  Flutter version differs from CI and resolves slightly different versions; revert
  the lockfile so the feature diff stays clean.

## LGTM → process retrospective

When the user says **"LGTM"** (a UserPromptSubmit hook,
`.claude/hooks/lgtm-retrospective.sh`, reminds Claude), run a short, ranked,
**measured** retrospective of the work just completed — the questions the user
keeps asking about slow processes:

1. **How many processes ran**, and could it be fewer (ideally one)?
2. **What took longest** — give wall-clock numbers, separating Dart compile vs
   test/render execution vs idle waiting.
3. Was each process **killed immediately** once its work was done?
4. Did every test/render **finish only after all work was finished** (no dangling
   async/ticker — the "test doesn't finish until the work finishes" rule)?
5. The **single highest-leverage change** to make it shorter next time.

## Flutter prerequisite (Claude Code on the web)

Cloud sessions do **not** ship Flutter. Install it **once** via the environment's
**setup script** (web UI → environment settings → *Setup script*), not a per-session
download: the setup script runs the first time a session starts in an environment,
then Anthropic **snapshots the filesystem and reuses that snapshot**, so later
sessions already have the SDK on disk (the script step is skipped). This is the
"download once, cache in the image" path — far better than re-fetching each session.

Suggested setup-script snippet (keep total runtime under ~5 min so the cache can
build; the download is ~1–2 min):

```bash
# Install Flutter (stable) once; cached into the environment snapshot.
if [ ! -x /opt/flutter/bin/flutter ]; then
  curl -fsSL -o /tmp/flutter.tar.xz \
    https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.5-stable.tar.xz
  tar xf /tmp/flutter.tar.xz -C /opt && rm -f /tmp/flutter.tar.xz
fi
ln -sf /opt/flutter/bin/flutter /usr/local/bin/flutter
ln -sf /opt/flutter/bin/dart /usr/local/bin/dart
git config --global --add safe.directory /opt/flutter || true
flutter --version || true
flutter precache --universal || true   # warm artifacts so the first test is fast
```

The setup script is attached to the **cloud environment** (not the repo), so it
must be set in the web UI — ask the user to paste it. A repo-committed SessionStart
hook (`.claude/settings.json`) is an alternative that also works locally, but it
re-runs every session instead of being snapshot-cached, so the setup script is
preferred for a large SDK download.
