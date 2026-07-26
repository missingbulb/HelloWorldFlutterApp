import { finding, lineOf } from './finding.mjs';

// Every UI image this repo ships comes out of ONE `flutter test` run of
// tool/render_states.dart, whose `_expectedImages` list is both the render plan
// and the run's completion guard (the DONE marker only prints once every name in
// it is on disk and non-empty). So that list is the golden set's single source of
// truth, and two other places have to agree with it: the committed PNGs under
// test/goldens/ and the table in CLAUDE.md. A name added to the harness but never
// committed, or a PNG left behind by a rename, is invisible until someone reads
// the pixels — and a stale doc table sends the next reader to a file that is not
// there. (The scripts deliberately do NOT re-list the names; they defer to the
// harness, which is why this rule only has three places to compare.)
const HARNESS = 'tool/render_states.dart';
const DOC = 'CLAUDE.md';
const EXPECTED = /_expectedImages\s*=\s*<String>\[([\s\S]*?)\]/;
const GOLDEN_FILE = /^test\/goldens\/(.+)\.png$/;

const list = (set) => [...set].sort().join(', ');

const rule = {
  id: 'hello-world-flutter/golden-set-single-source',
  severity: 'blocking',
  description: "The golden set is declared once in render_states.dart's _expectedImages; test/goldens/ and CLAUDE.md must match it",
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'the harness list is the render plan AND the completion guard, so a name it does not carry is never rendered and a PNG it does not name is never refreshed',

  run(ctx) {
    const harness = ctx.read(HARNESS);
    if (harness === null) return [];
    const body = EXPECTED.exec(harness);
    if (!body) return [];

    const declared = new Set([...body[1].matchAll(/'([^']*)'/g)].map((m) => m[1]));
    if (declared.size === 0) return [];
    const onDisk = new Set(
      ctx.tracked.map((f) => GOLDEN_FILE.exec(f)).filter(Boolean).map((m) => m[1]),
    );

    const out = [];
    const harnessLine = lineOf(harness, EXPECTED);

    const missing = [...declared].filter((n) => !onDisk.has(n));
    if (missing.length) {
      out.push(finding(rule, {
        file: HARNESS,
        line: harnessLine,
        what: `_expectedImages names ${list(missing)}, which is not committed under test/goldens/`,
        fix: 'run `python3 build.py` and commit the regenerated PNGs (one run writes every golden)',
      }));
    }

    const orphaned = [...onDisk].filter((n) => !declared.has(n));
    if (orphaned.length) {
      out.push(finding(rule, {
        file: `test/goldens/${orphaned.sort()[0]}.png`,
        what: `test/goldens/ holds ${list(orphaned)}, which _expectedImages does not name — nothing regenerates it`,
        fix: `add the name to _expectedImages in ${HARNESS} (and render it), or delete the stale PNG`,
      }));
    }

    const doc = ctx.read(DOC);
    if (doc !== null) {
      const documented = new Set(
        [...doc.matchAll(/test\/goldens\/([\w.-]+)\.png/g)].map((m) => m[1]),
      );
      const undocumented = [...declared].filter((n) => !documented.has(n));
      if (undocumented.length) {
        out.push({
          ...finding(rule, {
            file: DOC,
            what: `the golden table does not list ${list(undocumented)}, which the harness renders`,
            fix: `add a row per image to the golden table in ${DOC} (file | the state it captures)`,
          }),
          severity: 'advisory',
        });
      }
    }

    return out;
  },
};

export default rule;
