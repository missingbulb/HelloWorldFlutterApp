// Red-first fixtures for this pack's checks: every rule must FIRE on a violating
// input and stay QUIET on a clean one — plus a live case that runs all three
// against the real working tree, so the checks guard the repo from CI and not
// only from a session-start sweep.
//
//   node --test .claudinite/local/packs/hello-world-flutter/pack.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pack from './pack.mjs';
import colorCycleLockstep from './color-cycle-lockstep.mjs';
import goldenSetSingleSource from './golden-set-single-source.mjs';
import oneFlutterTestRunner from './one-flutter-test-runner.mjs';

// The check context the engine passes a world-scope rule, reduced to what these
// rules touch: the tracked file list plus a reader that returns null for absent.
const ctx = (files) => ({
  tracked: Object.keys(files).sort(),
  read: (path) => (path in files ? files[path] : null),
  exists: (path) => path in files,
});

const cleanApp = `
  static const List<Color> _cycle = <Color>[
    Colors.blue,
    Colors.red,
    Colors.purple,
  ];
  static const List<String> _colorNames = <String>['blue', 'red', 'purple'];
  theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue)),
  style: ElevatedButton.styleFrom(foregroundColor: _backgroundColor),
`;

test('color-cycle-lockstep is quiet on a cycle that agrees with itself', () => {
  assert.deepEqual(colorCycleLockstep.run(ctx({ 'lib/main.dart': cleanApp })), []);
});

test('color-cycle-lockstep fires on a colour added without its label', () => {
  const app = cleanApp.replace('Colors.purple,\n  ];', 'Colors.purple,\n    Colors.green,\n  ];');
  const found = colorCycleLockstep.run(ctx({ 'lib/main.dart': app }));
  assert.equal(found.length, 1);
  assert.match(found[0].what, /4 colours but _colorNames has 3/);
  assert.equal(found[0].rule, 'hello-world-flutter/color-cycle-lockstep');
});

test('color-cycle-lockstep fires on a label that names the wrong colour', () => {
  const app = cleanApp.replace("'blue', 'red', 'purple'", "'blue', 'crimson', 'purple'");
  const found = colorCycleLockstep.run(ctx({ 'lib/main.dart': app }));
  assert.equal(found.length, 1);
  assert.match(found[0].what, /_cycle\[1\] is Colors\.red but _colorNames\[1\] is 'crimson'/);
});

test('color-cycle-lockstep fires when the theme seed is not the starting colour', () => {
  const app = cleanApp.replace('seedColor: Colors.blue', 'seedColor: Colors.orange');
  const found = colorCycleLockstep.run(ctx({ 'lib/main.dart': app }));
  assert.equal(found.length, 1);
  assert.match(found[0].what, /seeds from Colors\.orange/);
});

test('color-cycle-lockstep fires when the button stops following the background', () => {
  const app = cleanApp.replace('foregroundColor: _backgroundColor', 'foregroundColor: Colors.blue');
  const found = colorCycleLockstep.run(ctx({ 'lib/main.dart': app }));
  assert.equal(found.length, 1);
  assert.match(found[0].what, /pinned to Colors\.blue/);
});

const harness = (names) =>
  `const List<String> _expectedImages = <String>[\n${names.map((n) => `  '${n}',`).join('\n')}\n];`;
const goldenDoc = (names) => names.map((n) => `| \`test/goldens/${n}.png\` | a state |`).join('\n');

const goldenRepo = (declared, onDisk, documented) => {
  const files = { 'tool/render_states.dart': harness(declared), 'CLAUDE.md': goldenDoc(documented) };
  for (const n of onDisk) files[`test/goldens/${n}.png`] = '';
  return ctx(files);
};

test('golden-set-single-source is quiet when harness, disk and doc agree', () => {
  const names = ['state_initial', 'state_after_press_1'];
  assert.deepEqual(goldenSetSingleSource.run(goldenRepo(names, names, names)), []);
});

test('golden-set-single-source fires on a declared image that was never committed', () => {
  const found = goldenSetSingleSource.run(
    goldenRepo(['state_initial', 'state_after_press_1'], ['state_initial'], ['state_initial', 'state_after_press_1']),
  );
  assert.equal(found.length, 1);
  assert.match(found[0].what, /state_after_press_1, which is not committed/);
  assert.equal(found[0].severity, 'blocking');
});

test('golden-set-single-source fires on a PNG nothing regenerates', () => {
  const found = goldenSetSingleSource.run(
    goldenRepo(['state_initial'], ['state_initial', 'state_after_press_9'], ['state_initial']),
  );
  assert.equal(found.length, 1);
  assert.match(found[0].what, /state_after_press_9, which _expectedImages does not name/);
});

test('golden-set-single-source flags an undocumented image as advisory', () => {
  const names = ['state_initial', 'state_after_press_1'];
  const found = goldenSetSingleSource.run(goldenRepo(names, names, ['state_initial']));
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 'advisory');
  assert.equal(found[0].file, 'CLAUDE.md');
});

const goodRunner = `
proc = subprocess.Popen([flutter, "test", *test_paths], start_new_session=True)
os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
`;

test('one-flutter-test-runner is quiet when the scripts call the shared runner', () => {
  const found = oneFlutterTestRunner.run(ctx({
    'flutter_test_runner.py': goodRunner,
    'build.py': 'from flutter_test_runner import run\nrun(["test/widget_test.dart"], "All tests passed!")',
  }));
  assert.deepEqual(found, []);
});

test('one-flutter-test-runner fires on a script that spawns Flutter itself', () => {
  const found = oneFlutterTestRunner.run(ctx({
    'flutter_test_runner.py': goodRunner,
    'render_one.py': 'import subprocess\nsubprocess.run(["flutter", "test", "tool/render_states.dart"])',
  }));
  assert.equal(found.length, 1);
  assert.equal(found[0].file, 'render_one.py');
  assert.match(found[0].what, /spawns Flutter itself/);
});

test('one-flutter-test-runner fires on setsid backgrounding', () => {
  const found = oneFlutterTestRunner.run(ctx({
    'flutter_test_runner.py': goodRunner,
    'ci.py': 'os.system("setsid flutter test &")',
  }));
  assert.ok(found.some((f) => /setsid/.test(f.what)), 'expected the setsid finding');
});

test('one-flutter-test-runner fires when the runner loses its process group', () => {
  const found = oneFlutterTestRunner.run(ctx({
    'flutter_test_runner.py': 'proc = subprocess.Popen([flutter, "test"])\nproc.wait()',
  }));
  assert.equal(found.length, 2);
  assert.ok(found.every((f) => f.file === 'flutter_test_runner.py'));
});

test('every rule is quiet on the real working tree', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const tracked = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const live = {
    tracked,
    read(path) {
      try { return readFileSync(join(root, path), 'utf8'); } catch { return null; }
    },
    exists: (path) => tracked.includes(path),
  };
  for (const rule of pack.rules) {
    assert.deepEqual(
      rule.run(live).map((f) => `${f.file}: ${f.what}`),
      [],
      `${rule.id} should be quiet on the real tree`,
    );
  }
});
