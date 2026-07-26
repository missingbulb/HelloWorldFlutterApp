// The finding shape the checks engine renders, built locally on purpose: a local
// pack's rule modules must load without the gitignored shared mount, so they
// never import `engine/checks/helpers/findings.mjs`. Keep this in step with that
// helper's return shape.
export const finding = (rule, { file, line = null, what, fix }) => ({
  rule: rule.id,
  severity: rule.severity,
  file,
  line,
  what,
  why: rule.why,
  fix,
  doc: rule.doc,
});

// Python source with its prose blanked out — `#` comments and triple-quoted
// docstrings become empty lines, so a rule scans what the interpreter runs and not
// what the file says ABOUT running it. Line count is preserved so `lineOf` still
// points at the real line. Necessary here because this repo's scripts document the
// very patterns they forbid ("do NOT reimplement this with bash `setsid ... &`"),
// and a naive substring scan would flag the warning as the violation.
export const pythonCode = (text) => {
  let delimiter = null;
  return text.split('\n').map((raw) => {
    let line = raw;
    if (delimiter) {
      if (!line.includes(delimiter)) return '';
      line = line.slice(line.indexOf(delimiter) + 3);
      delimiter = null;
    }
    for (const d of ['"""', "'''"]) {
      const open = line.indexOf(d);
      if (open === -1) continue;
      const close = line.indexOf(d, open + 3);
      if (close === -1) { delimiter = d; line = line.slice(0, open); }
      else line = line.slice(0, open) + line.slice(close + 3);
    }
    const hash = line.indexOf('#');
    return hash === -1 ? line : line.slice(0, hash);
  }).join('\n');
};

// 1-based line number of the first line matching `pattern`, or null.
export const lineOf = (text, pattern) => {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) if (pattern.test(lines[i])) return i + 1;
  return null;
};
