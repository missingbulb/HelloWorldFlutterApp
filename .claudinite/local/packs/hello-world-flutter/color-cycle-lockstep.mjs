import { finding, lineOf } from './finding.mjs';

// The app's whole behaviour is one ordered colour cycle, and lib/main.dart spells
// it out in three places that a human has to keep aligned by hand: the `_cycle`
// list, the parallel `_colorNames` labels the button writes into the greeting, and
// the theme's `ColorScheme.fromSeed` seed (which must be the colour the app starts
// on). Editing one and not the others compiles, and — because `_colorNames` is
// indexed by the same `_colorIndex` — ships a screen that says "hello world red"
// on a purple background. That is exactly the class of drift a regex can catch
// before `flutter test` is even booted.
const CYCLE = /_cycle\s*=\s*<Color>\[([\s\S]*?)\]/;
const NAMES = /_colorNames\s*=\s*<String>\[([\s\S]*?)\]/;
const SEED = /ColorScheme\.fromSeed\(\s*seedColor:\s*Colors\.(\w+)/;
const FOREGROUND = /foregroundColor:\s*([A-Za-z_][\w.]*)/;

const APP = 'lib/main.dart';

const rule = {
  id: 'hello-world-flutter/color-cycle-lockstep',
  severity: 'blocking',
  description: 'lib/main.dart declares the colour cycle once: _cycle, _colorNames and the theme seed agree',
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'the label is indexed by the cycle index, so a cycle edit that misses _colorNames or the seed ships a screen whose text names the wrong colour',

  run(ctx) {
    const text = ctx.read(APP);
    if (text === null) return [];

    const cycleBody = CYCLE.exec(text);
    const namesBody = NAMES.exec(text);
    // No cycle declared at all — a different app shape, nothing to keep in step.
    if (!cycleBody || !namesBody) return [];

    const colors = [...cycleBody[1].matchAll(/Colors\.(\w+)/g)].map((m) => m[1]);
    const names = [...namesBody[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const namesLine = lineOf(text, NAMES);
    const out = [];

    if (colors.length !== names.length) {
      out.push(finding(rule, {
        file: APP,
        line: namesLine,
        what: `_cycle has ${colors.length} colours but _colorNames has ${names.length} labels`,
        fix: 'add or remove the matching _colorNames entry so the two lists stay index-for-index',
      }));
    }

    for (let i = 0; i < Math.min(colors.length, names.length); i += 1) {
      if (colors[i].toLowerCase() !== names[i].toLowerCase()) {
        out.push(finding(rule, {
          file: APP,
          line: namesLine,
          what: `_cycle[${i}] is Colors.${colors[i]} but _colorNames[${i}] is '${names[i]}'`,
          fix: `name entry ${i} '${colors[i].toLowerCase()}' — the label is looked up by the cycle index`,
        }));
      }
    }

    const seed = SEED.exec(text);
    if (seed && colors.length && seed[1] !== colors[0]) {
      out.push(finding(rule, {
        file: APP,
        line: lineOf(text, SEED),
        what: `the theme seeds from Colors.${seed[1]} but the app starts on _cycle[0] = Colors.${colors[0]}`,
        fix: `seed the ColorScheme from Colors.${colors[0]}, the first entry of _cycle`,
      }));
    }

    // The button's foreground must track the background, not a pinned literal —
    // widget_test.dart asserts exactly that after every press.
    const foreground = FOREGROUND.exec(text);
    if (foreground && foreground[1] !== '_backgroundColor') {
      out.push(finding(rule, {
        file: APP,
        line: lineOf(text, FOREGROUND),
        what: `the button's foregroundColor is pinned to ${foreground[1]} instead of following _backgroundColor`,
        fix: 'set foregroundColor: _backgroundColor so the label re-colours with the cycle',
      }));
    }

    return out;
  },
};

export default rule;
