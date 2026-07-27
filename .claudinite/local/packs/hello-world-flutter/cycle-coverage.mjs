import { finding, lineOf } from './finding.mjs';

// `color-cycle-lockstep` keeps lib/main.dart honest with ITSELF; this rule keeps
// the rest of the repo in step with the cycle. Pressing the button N times (N =
// _cycle.length) walks the app through every entry, and the repo covers that walk
// in two places a cycle edit has to grow with it: one widget test per press in
// test/widget_test.dart, and one rendered state per press in the golden set that
// tool/render_states.dart declares. Add a fourth colour and both silently keep
// passing — the suite is still green, the goldens still regenerate, and the new
// state is simply never exercised or looked at. Which colours the cycle holds and
// which the test file names are both static text, so the gap is visible without
// booting Flutter.
const APP = 'lib/main.dart';
const TEST = 'test/widget_test.dart';
const HARNESS = 'tool/render_states.dart';

const CYCLE = /_cycle\s*=\s*<Color>\[([\s\S]*?)\]/;
const NAMES = /_colorNames\s*=\s*<String>\[([\s\S]*?)\]/;
const EXPECTED = /_expectedImages\s*=\s*<String>\[([\s\S]*?)\]/;

// press count that lands on cycle index i: index 0 is only reached by completing
// the whole cycle, every other index by its own ordinal.
const pressesFor = (i, length) => (i === 0 ? length : i);

const rule = {
  id: 'hello-world-flutter/cycle-coverage',
  severity: 'blocking',
  description: 'Every colour in lib/main.dart\'s cycle has a widget test asserting it and a golden rendering it',
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'a colour added to the cycle without its per-press test and golden ships an untested, unseen state — the suite stays green because nothing ever presses that far',

  run(ctx) {
    const app = ctx.read(APP);
    if (app === null) return [];

    const cycleBody = CYCLE.exec(app);
    const namesBody = NAMES.exec(app);
    // No cycle declared at all — a different app shape, nothing to cover.
    if (!cycleBody || !namesBody) return [];

    const colors = [...cycleBody[1].matchAll(/Colors\.(\w+)/g)].map((m) => m[1]);
    const names = [...namesBody[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
    // A length mismatch is color-cycle-lockstep's finding to report, not this
    // rule's; cover the aligned prefix so the two checks never double-report.
    const length = Math.min(colors.length, names.length);
    if (length === 0) return [];

    const out = [];
    const test = ctx.read(TEST);

    if (test !== null) {
      for (let i = 0; i < length; i += 1) {
        const presses = pressesFor(i, length);
        const gaps = [];
        if (!test.includes(`hello world ${names[i]}`)) gaps.push(`the label 'hello world ${names[i]}'`);
        if (!new RegExp(`Colors\\.${colors[i]}\\b`).test(test)) gaps.push(`a Colors.${colors[i]} background`);
        if (gaps.length) {
          out.push(finding(rule, {
            file: TEST,
            what: `press ${presses} lands on Colors.${colors[i]}, but ${TEST} never asserts ${gaps.join(' or ')}`,
            fix: `add a test that taps 'change color' ${presses} time(s) and expects find.text('hello world ${names[i]}') and scaffold.backgroundColor == Colors.${colors[i]}`,
          }));
        }
      }
    }

    const harness = ctx.read(HARNESS);
    const expected = harness === null ? null : EXPECTED.exec(harness);
    if (expected) {
      const declared = new Set([...expected[1].matchAll(/'([^']*)'/g)].map((m) => m[1]));
      // Only judge the harness once it uses the state_after_press_N convention —
      // a harness that names its states differently is not this rule's business.
      if ([...declared].some((n) => /^state_after_press_\d+$/.test(n))) {
        const missing = [];
        for (let press = 1; press <= length; press += 1) {
          if (!declared.has(`state_after_press_${press}`)) missing.push(`state_after_press_${press}`);
        }
        if (missing.length) {
          out.push(finding(rule, {
            file: HARNESS,
            line: lineOf(harness, EXPECTED),
            what: `the cycle is ${length} colours long but _expectedImages does not render ${missing.join(', ')}`,
            fix: 'add the missing state name to _expectedImages, capture it after its press in the harness, then run `python3 build.py` and commit the PNG',
          }));
        }
      }
    }

    return out;
  },
};

export default rule;
