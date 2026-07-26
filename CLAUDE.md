# HelloWorldFlutterApp

A Flutter app with a colored background, "hello world" text, and a "change color"
button that cycles the background through blue → red → purple → blue. Once pressed,
the label names the current colour ("hello world red" / "hello world purple" /
"hello world blue").
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

**When the build can be skipped (allowlist, fail-safe).** Skip the build **only
if *every* changed file matches a docs allowlist** (`*.md`, `README*`, `LICENSE`,
`docs/**`); if **any** file falls outside that set — including new or unknown
types — **build**. Default to building: a wasted build is cheap, an untested
change is not. An allowlist fails safe (anything unrecognized is built); a
denylist of "build-relevant" paths fails open (anything unlisted ships untested).

Both write every golden in one run:

| File | State |
|------|-------|
| `test/goldens/initial_screen.png` | blue (initial; legacy name) |
| `test/goldens/state_initial.png` | blue (before any press) |
| `test/goldens/state_after_press_1.png` | red (after one press) |
| `test/goldens/state_after_press_2.png` | purple (after two presses) |
| `test/goldens/state_after_press_3.png` | blue (after three presses) |

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

The general lesson now lives in the canon `flutter` pack ("Load real fonts before
any golden", `packs/flutter/RULES.md`): the test binding defaults to the
glyph-less Ahem stub (text renders as boxes), so real fonts must be
`FontLoader`-loaded before any widget is pumped, and `ButtonStyle`/`styleFrom`
text styles don't inherit the theme's `fontFamily` — pin it there explicitly.
This repo's concrete wiring of that rule:

1. Roboto font files are bundled in `fonts/` and declared in `pubspec.yaml`.
2. The test harness loads them via `FontLoader` before pumping any widgets.
3. `ThemeData` has `fontFamily: 'Roboto'` to cover most widgets.
4. `ElevatedButton.styleFrom`'s `textStyle` pins `fontFamily: 'Roboto'`
   **explicitly** (the `styleFrom` leak the canon warns about) — without it the
   button label falls back to Ahem and renders as a blank rectangle in goldens
   while looking correct in production.

## Changing the app color, and this sandbox's process notes

Both live in this repo's own pack, `.claudinite/local/packs/hello-world-flutter/`
(`RULES.md` loads every session), with three checks enforcing the mechanical parts:
the colour cycle's lockstep in `lib/main.dart`, the golden set's single declaration
in `tool/render_states.dart`, and one `flutter test` runner.

## LGTM → verify, merge, then process retrospective

When the user says **"LGTM"** as approval (judge from context — a mention of the
word while *discussing* this workflow is not an approval):

1. **Update the feature branch from `main`** (pull/merge `origin main` into it) so
   it is verified against the code it will become.
2. **Run the full build** (`python3 build.py`) and confirm **all tests are green**
   on the updated branch. If anything fails, **stop and report — do not merge.**
3. **Only after tests pass**, merge the feature branch into `main` (fast-forward
   local `main`, then push `origin main`) and confirm the push succeeded.
4. **Only after the merge is pushed**, run a short, ranked, **measured**
   retrospective of the work just completed — the questions the user keeps asking
   about slow processes:

1. **How many processes ran**, and could it be fewer (ideally one)?
2. **What took longest** — give wall-clock numbers, separating Dart compile vs
   test/render execution vs idle waiting.
3. Was each process **killed immediately** once its work was done?
4. Did every test/render **finish only after all work was finished** (no dangling
   async/ticker — the "test doesn't finish until the work finishes" rule)?
5. The **single highest-leverage change** to make it shorter next time.

Close the retrospective with a **terse verdict** either way: either a concrete
speed-up recommendation, or an explicit "no changes recommended — already optimal."

## Flutter prerequisite (Claude Code on the web)

Cloud sessions do **not** ship Flutter. Install it **once** via the environment's
**setup script**, not a per-session download: the setup script runs the first time
a session starts in an environment, then Anthropic **snapshots the filesystem and
reuses that snapshot**, so later sessions already have the SDK on disk (the script
step is skipped). This is the "download once, cache in the image" path.

**The setup script and the Flutter install are corpus-owned — this repo keeps no
copy of either** (PR #14, adopting Claudinite's pack-driven env model). The generic
setup script ships with the vendored corpus's session hooks (exact path under
**To set it up** below); it sets git hygiene and runs
`node .claudinite/shared/engine/pack_loader/env-requirements.mjs install`, and the
**`flutter` pack** (declared in this repo) is what carries the
SDK install + pinned version. So there is **no** project-local
`.claude/environment-setup.sh` and **no** `.claude/hooks/check-environment.sh` /
`ENV_SETUP_VERSION` flag any more — don't recreate them; change the install by
editing the flutter pack upstream, not by adding a bespoke installer here.

**To set it up:** copy the full contents of
`.claudinite/shared/engine/hooks/environment-setup-command.sh` into the
environment's *Setup script* field (web UI → environment selector → edit
environment → Setup script), then start a fresh session so the snapshot rebuilds.

**Validation.** The session-start hook runs
`node .claudinite/shared/engine/pack_loader/env-requirements.mjs check`, which
asserts Flutter is present each cloud session and, if not, injects context
telling Claude to alert the user to (re-)paste the corpus setup script and
restart. The corpus is tracked (vendored), so the check can always run — no
sync ordering to worry about.
