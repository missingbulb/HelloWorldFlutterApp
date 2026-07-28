import { finding, lineOf } from './finding.mjs';
import { colorNames } from './color-cycle-lockstep.mjs';

// Pressing the button walks `_cycle` in order and wraps, so N colours means N
// presses to see every state — and test/widget_test.dart carries one test per
// press. Lengthening the cycle in lib/main.dart therefore silently leaves the
// last colour (and the wrap back to the first) asserted by nothing: the suite
// still passes, because it simply never presses that far. That is the drift this
// rule catches. Each colour needs BOTH halves of the state asserted — the label
// the press writes (`find.text('hello world <colour>')`) and the background it
// sets (`expect(scaffold.backgroundColor, Colors.<colour>)`) — since the whole
// point of the label is to name the colour actually on screen.
//
// Scoped to the labels the app declares, not to a count of `testWidgets` blocks:
// naming the missing colour is what tells the author which press to add.
const APP = 'lib/main.dart';
const TEST = 'test/widget_test.dart';

const asserts = {
  label: (name) => new RegExp(`hello world ${name}(?![\\w])`),
  background: (name) => new RegExp(`backgroundColor,\\s*Colors\\.${name}(?![\\w])`),
};

const rule = {
  id: 'hello-world-flutter/cycle-test-coverage',
  severity: 'blocking',
  description: 'test/widget_test.dart asserts the label and background of every colour in the cycle',
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'the presses walk the cycle in order, so a colour no test presses far enough to reach is a state the green suite never looked at',

  run(ctx) {
    const app = ctx.read(APP);
    if (app === null) return [];
    const names = colorNames(app);
    if (names.length === 0) return [];

    const text = ctx.read(TEST);
    if (text === null) return [];

    const out = [];
    names.forEach((name, i) => {
      const missing = Object.entries(asserts)
        .filter(([, pattern]) => !pattern(name).test(text))
        .map(([half]) => half);
      if (missing.length === 0) return;
      // The press that lands on entry i is the i-th (and the 0-th entry is
      // reached again by the press that wraps, i.e. the cycle-length-th).
      const press = i === 0 ? names.length : i;
      out.push(finding(rule, {
        file: TEST,
        line: lineOf(text, /void main\(\)/),
        what: `no test asserts the ${missing.join(' or ')} of _cycle[${i}] (Colors.${name})`,
        fix: `add a testWidgets case that taps 'change color' ${press} time(s), then expects find.text('hello world ${name}') and scaffold.backgroundColor == Colors.${name}`,
      }));
    });
    return out;
  },
};

export default rule;
