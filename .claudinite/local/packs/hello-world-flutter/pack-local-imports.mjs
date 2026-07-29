import { finding, lineOf } from './finding.mjs';

// A local pack is loaded by `import()`ing its modules at session start, in an
// environment that guarantees nothing but the pack's own directory: the shared
// canon under `.claudinite/shared/` is a mount that may not be synced yet, and
// this repo has no `package.json`, so there is no `node_modules` at all. One
// import that reaches past the pack directory therefore throws at load time —
// and the failure is silent in the worst way, because a pack that fails to load
// declares no rules, so every check it owns (the colour cycle, the golden set,
// the single runner) simply stops guarding the repo without saying so.
//
// That is why `finding.mjs` exists as a local copy of the engine's helper rather
// than an import of it. This rule is what keeps that discipline true of every
// module in the pack, including the ones added later.
//
// Allowlist, not denylist: exactly two specifier forms pass — a `node:` builtin
// (always present, no resolution required) and a relative path that lands on a
// tracked file inside the same pack. Anything else, including a form nobody
// anticipated, is a finding.
const PACKS = '.claudinite/local/packs/';
const MODULE = /^\.claudinite\/local\/packs\/([^/]+)\/.+\.mjs$/;

const SPECIFIERS = [
  /\bfrom\s*['"]([^'"]+)['"]/g, // import … from '…' / export … from '…'
  /\bimport\s*['"]([^'"]+)['"]/g, // side-effect import
  /\bimport\s*\(\s*['"]([^'"]+)['"]/g, // dynamic import
  /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
];

// JavaScript with its prose removed: `//` and block comments drop out, string
// literals survive intact, and newlines are kept so `lineOf` still points at the
// real line. The scan then reads what node resolves and not what a comment says
// ABOUT resolving it — necessary because this pack's modules discuss the very
// import they forbid ("never import the engine's findings helper"), and because
// a comment trailing a line of code is as common as one owning its own line.
// Quote-aware on purpose: cutting blindly at `//` would also cut a specifier
// that contains one (`https://…`), and that is a violation this must still see.
const jsCode = (text) => {
  let out = '';
  let quote = null; // ' " or ` while inside a string literal
  let comment = null; // 'line' or 'block'
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];
    if (comment === 'line') {
      if (c === '\n') { comment = null; out += c; }
      continue;
    }
    if (comment === 'block') {
      if (c === '*' && next === '/') { comment = null; i += 1; } else if (c === '\n') out += c;
      continue;
    }
    if (quote) {
      out += c;
      if (c === '\\') { out += next ?? ''; i += 1; } else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { comment = 'line'; i += 1; continue; }
    if (c === '/' && next === '*') { comment = 'block'; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
  }
  return out;
};

// Resolve `spec` against `dir` the way node does, without importing node:path —
// a rule module of this pack may not reach outside it either.
const resolve = (dir, spec) => {
  const out = dir === '' ? [] : dir.split('/');
  for (const part of spec.split('/')) {
    if (part === '' || part === '.') continue;
    if (part !== '..') out.push(part);
    else if (out.length) out.pop();
    else return null; // climbed above the repo root
  }
  return out.join('/');
};

const rule = {
  id: 'hello-world-flutter/pack-local-imports',
  severity: 'blocking',
  description: 'Every module in a local pack imports only node: builtins and files inside its own pack directory',
  doc: '.claudinite/local/packs/hello-world-flutter/README.md',
  why: 'the engine imports these modules at session start, when the shared canon mount may be unsynced and there is no node_modules; an import that reaches outside the pack throws, the pack loads no rules at all, and every check it declares stops guarding this repo silently',

  run(ctx) {
    const out = [];
    for (const file of ctx.tracked) {
      const owner = MODULE.exec(file);
      if (!owner) continue;
      const text = ctx.read(file);
      if (text === null) continue;

      const packDir = `${PACKS}${owner[1]}`;
      const dir = file.slice(0, file.lastIndexOf('/'));
      const code = jsCode(text);

      const seen = new Set();
      for (const pattern of SPECIFIERS) {
        for (const m of code.matchAll(pattern)) {
          const spec = m[1];
          if (seen.has(spec) || spec.startsWith('node:')) continue;
          seen.add(spec);

          const at = lineOf(code, new RegExp(`['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
          const report = (what, fix) => out.push(finding(rule, { file, line: at, what, fix }));

          if (!spec.startsWith('./') && !spec.startsWith('../')) {
            report(
              `imports \`${spec}\`, a package specifier resolved through node_modules`,
              'inline what you need into the pack directory (as finding.mjs inlines the engine\'s helper), or use a node: builtin',
            );
            continue;
          }

          const target = resolve(dir, spec);
          if (target === null || (target !== packDir && !target.startsWith(`${packDir}/`))) {
            report(
              `imports \`${spec}\`, which resolves to ${target ?? 'above the repo root'} — outside ${packDir}`,
              `copy what the module needs into ${packDir} so it loads with nothing but its own directory present`,
            );
            continue;
          }

          if (!ctx.exists(target)) {
            report(
              `imports \`${spec}\`, which is not a tracked file (${target})`,
              'commit the file it names, or fix the specifier — an unresolvable import fails the whole pack, not just this module',
            );
          }
        }
      }
    }
    return out;
  },
};

export default rule;
