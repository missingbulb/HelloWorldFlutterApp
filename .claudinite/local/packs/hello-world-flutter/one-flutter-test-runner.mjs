import { finding, lineOf, pythonCode } from './finding.mjs';

// This sandbox has no GPU and drops outbound sockets, so `flutter test` blocks in
// teardown for a hardcoded ~600s after the work is done. flutter_test_runner.py is
// the ONE place that knows the way out: stream the output, kill the whole process
// group the instant the done-marker prints, and watchdog-kill on silence. The two
// entry points (build.py, generate_screenshots.py) call into it — a third script
// that reaches for subprocess itself re-earns the 10-minute stall, and one that
// backgrounds the run with `setsid ... &` detaches the job so its exit status can
// no longer be read (learned the hard way; CLAUDE.md records both).
//
// The kill itself rests on `start_new_session=True`: without it the child shares
// OUR process group and the `os.killpg` aimed at the stall would kill the runner.
const RUNNER = 'flutter_test_runner.py';
const SPAWNS = /subprocess\.|os\.system|os\.popen|os\.exec/;
const FLUTTER = /['"]flutter['"]|flutter\s+test/;
const SETSID = /\bsetsid\b/;

const rule = {
  id: 'hello-world-flutter/one-flutter-test-runner',
  severity: 'blocking',
  description: 'Every scripted `flutter test` goes through flutter_test_runner.py, which owns the process-group kill',
  doc: '.claudinite/local/packs/hello-world-flutter/RULES.md',
  why: 'the ~600s teardown stall is only survivable by killing the process group on the done-marker; a script that spawns flutter itself pays the stall, and setsid backgrounding loses the exit status',

  run(ctx) {
    const out = [];

    for (const file of ctx.tracked) {
      if (!file.endsWith('.py')) continue;
      const raw = ctx.read(file);
      if (raw === null) continue;
      // Scan the code, not the comments: these scripts explain the traps they avoid.
      const text = pythonCode(raw);

      if (file !== RUNNER && SPAWNS.test(text) && FLUTTER.test(text)) {
        out.push(finding(rule, {
          file,
          line: lineOf(text, SPAWNS),
          what: 'spawns Flutter itself instead of calling the shared runner',
          fix: `import run from ${RUNNER} and pass every test path in ONE call, with the marker that means the work is finished`,
        }));
      }

      if (SETSID.test(text)) {
        out.push(finding(rule, {
          file,
          line: lineOf(text, SETSID),
          what: 'backgrounds a run with setsid, which detaches the job and breaks $!/exit-status tracking',
          fix: 'let flutter_test_runner.py own the child: subprocess.Popen(..., start_new_session=True) plus os.killpg',
        }));
      }
    }

    // The runner's own two load-bearing lines.
    const runnerRaw = ctx.read(RUNNER);
    if (runnerRaw !== null) {
      const runner = pythonCode(runnerRaw);
      for (const [needle, what, fix] of [
        [/start_new_session\s*=\s*True/, 'no longer starts the child in its own session',
          'pass start_new_session=True to Popen — os.killpg would otherwise kill this process too'],
        [/killpg/, 'no longer kills the process group on the done-marker',
          'kill the whole group once the marker prints, instead of waiting out the ~600s teardown stall'],
      ]) {
        if (!needle.test(runner)) {
          out.push(finding(rule, { file: RUNNER, what: `${RUNNER} ${what}`, fix }));
        }
      }
    }

    return out;
  },
};

export default rule;
