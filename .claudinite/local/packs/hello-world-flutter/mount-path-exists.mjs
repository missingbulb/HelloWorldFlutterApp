import { finding, lineOf } from './finding.mjs';

// Every `.claudinite/...` path this repo spells in its OWN files must still
// resolve inside the mount. The canon relays out its own layout on each baseline
// (this repo's copy has already moved through mount/, then shared/, then
// shared/engine/hooks/), and nothing upstream rewrites the references we keep on
// our side. The canon `claudinite-isolation` barrier notices only THAT a file
// names a mount path, never whether the path is real — and CLAUDE.md carries an
// `accept` entry for it, so on the one file that must name a mount path, that
// barrier is switched off entirely. This rule is what still looks.
//
// Scope: the wiring files that may legitimately spell a mount path (CLAUDE.md,
// .claude/, .github/workflows/, the settings file) plus this repo's own local
// packs. Files under .claudinite/shared/ are the vendored canon talking about
// itself — not ours to police.
const SHARED = '.claudinite/shared/';
const TEXT = /\.(md|json|ya?ml|sh|mjs|js|py|dart)$/;
const REF = /\.claudinite\/[A-Za-z0-9_./-]+/g;

// A reference resolves if the mount holds it as a tracked file or as a directory
// of one (CLAUDE.md points at `.claudinite/local/packs/hello-world-flutter/`).
const resolver = (tracked) => {
  const files = new Set(tracked);
  const dirs = new Set();
  for (const f of tracked) {
    const parts = f.split('/');
    for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'));
  }
  return (p) => files.has(p) || dirs.has(p);
};

const rule = {
  id: 'hello-world-flutter/mount-path-exists',
  severity: 'blocking',
  description: 'Every .claudinite/ path this repo names in its own files must resolve in the mount',
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'the canon relays out its own paths on every baseline and never rewrites our references; a stale one misdirects the manual Setup-script paste that is the only thing putting Flutter in a cloud session, and claudinite-isolation is accepted on CLAUDE.md so nothing else looks at it',

  run(ctx) {
    const resolves = resolver(ctx.tracked);
    // Mount absent (a checkout without the vendored canon): only our own local
    // packs are verifiable, so leave shared/ references alone rather than
    // flooding the sweep with findings about files that were never fetched.
    const mounted = ctx.tracked.some((f) => f.startsWith(SHARED));

    const out = [];
    for (const file of ctx.tracked) {
      if (file.startsWith(SHARED) || !TEXT.test(file)) continue;
      const text = ctx.read(file);
      if (text === null) continue;

      const seen = new Set();
      for (const m of text.matchAll(REF)) {
        // A trailing slash (a directory) or sentence period is punctuation, not path.
        const path = m[0].replace(/[./]+$/, '');
        if (seen.has(path)) continue;
        seen.add(path);
        if (!mounted && path.startsWith(SHARED)) continue;
        if (resolves(path)) continue;
        out.push(finding(rule, {
          file,
          line: lineOf(text, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
          what: `names \`${path}\`, which is not in the mount`,
          fix: "find the path's current home under the mount and update the reference — and the matching `accept` reason in .claudinite-checks.json if it quotes the old path",
        }));
      }
    }
    return out;
  },
};

export default rule;
