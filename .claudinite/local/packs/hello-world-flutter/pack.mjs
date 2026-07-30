import colorCycleLockstep from './color-cycle-lockstep.mjs';
import goldenSetSingleSource from './golden-set-single-source.mjs';
import mountPathExists from './mount-path-exists.mjs';
import oneFlutterTestRunner from './one-flutter-test-runner.mjs';
import packLocalImports from './pack-local-imports.mjs';

// This repo's own pack: what is true of HelloWorldFlutterApp specifically and of
// nothing else — the colour-cycle app's hand-kept invariants, the golden set its
// single render harness owns, and the one-runner process discipline this GPU-less
// sandbox forces. Everything portable about Flutter (real fonts before goldens, no
// pumpAndSettle around live tickers, the stall-robust runner pattern, the missing
// web SDK) is the canon `flutter` pack's, declared alongside this one — nothing
// here restates it.
//
// Declared by hand as `local/hello-world-flutter` in .claudinite-checks.json;
// never fingerprinted (detect/marker stay null). That the rule modules load with
// the shared mount absent is itself a check now — `pack-local-imports`.
export default {
  id: 'hello-world-flutter',
  ruleRoutingGuidance: {
    belongs: "this app's hand-kept invariants — colour-cycle lockstep, its golden set, the one-runner discipline",
    excludes: 'portable Flutter practice — real fonts, live tickers, the stall-robust runner — that is flutter',
  },
  detect: null,
  marker: null,
  prose: 'RULES.md',
  worldRules: [
    colorCycleLockstep,
    goldenSetSingleSource,
    mountPathExists,
    oneFlutterTestRunner,
    packLocalImports,
  ],
};
