// Renders the real application (lib/main.dart -> MyApp) at every state the UI
// tests cover, using Flutter's own rendering engine, and writes one PNG per
// state to test/goldens/. A SINGLE `flutter test` run produces ALL images:
// pump the app, capture, tap, capture, tap, capture.
//
//   initial_screen.png        blue  (legacy name for the initial screen)
//   state_initial.png         blue  (before any press)
//   state_after_press_1.png   red   (after one press)
//   state_after_press_2.png   blue  (after two presses)
//
// Design rules this file upholds (see CLAUDE.md):
//   * Fewest processes  — every image comes from this one test run.
//   * Synchronous completion — the test does not finish until all work is done.
//     Captures are awaited, files are written synchronously, and a final guard
//     verifies every PNG exists before the DONE marker is printed. If any work
//     is unfinished the marker never prints, so a stall is a real, visible
//     failure instead of a silent hang.
//
// Nothing is drawn by hand — pixels come from RenderRepaintBoundary.toImage().
// It is launched by tool/../generate_screenshots.py via `flutter test`.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hello_world_flutter/main.dart';

const List<String> _expectedImages = <String>[
  'initial_screen',
  'state_initial',
  'state_after_press_1',
  'state_after_press_2',
];

Future<void> _loadFonts() async {
  final loader = FontLoader('Roboto')
    ..addFont(rootBundle.load('fonts/Roboto-Regular.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Bold.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Medium.ttf'));
  await loader.load();
}

// Rasterizes the current frame to PNG bytes. The capture is awaited inside
// runAsync() because toImage()/toByteData() are driven by the engine's real
// async worker; once a ticker is live (the button's ink ripple) the fake-async
// test clock never pumps it, so awaiting them outside runAsync() would deadlock.
// Awaiting it here means the test cannot proceed until the bytes truly exist.
Future<ByteData> _rasterize(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byType(RepaintBoundary).first,
  );
  late final ByteData bytes;
  await tester.runAsync(() async {
    final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!;
  });
  return bytes;
}

void _writePng(String name, ByteData bytes) {
  final file = File('test/goldens/$name.png');
  file.parent.createSync(recursive: true);
  file.writeAsBytesSync(bytes.buffer.asUint8List()); // synchronous: on disk on return
  // ignore: avoid_print
  print('Rendered -> ${file.path}');
}

Future<void> _press(WidgetTester tester) async {
  await tester.tap(find.text('change color'));
  // Two pumps, not pumpAndSettle (the ink ripple keeps scheduling frames, so
  // pumpAndSettle would never return). The first frame applies the setState and
  // STARTS the button's implicit foreground-colour animation at t=0; the second,
  // long pump advances past the ~200ms colour animation and the ripple fade, so
  // the next capture shows the fully settled state and no ticker is left pending.
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('render MyApp at every UI state', (WidgetTester tester) async {
    await _loadFonts();

    await tester.pumpWidget(const RepaintBoundary(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    final ByteData initial = await _rasterize(tester); // blue
    _writePng('initial_screen', initial);
    _writePng('state_initial', initial);

    await _press(tester);
    _writePng('state_after_press_1', await _rasterize(tester)); // red

    await _press(tester);
    _writePng('state_after_press_2', await _rasterize(tester)); // blue

    // Synchronous-completion guard: the run is not "done" until every expected
    // image is on disk and non-empty. Throwing here fails the test, so the DONE
    // marker below is never reached — a hang or missing file is a hard failure.
    for (final String name in _expectedImages) {
      final File file = File('test/goldens/$name.png');
      if (!file.existsSync() || file.lengthSync() == 0) {
        throw StateError('Expected screenshot missing or empty: ${file.path}');
      }
    }

    // ignore: avoid_print
    print('All UI images rendered.');
  });
}
