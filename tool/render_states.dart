// Renders the real application (lib/main.dart -> MyApp) at each state exercised
// by the widget tests, using Flutter's own rendering engine, and writes one PNG
// per state to test/goldens/. A SINGLE `flutter test` run drives the whole
// sequence: pump the app, capture, tap, capture, tap, capture.
//
//   state_initial.png        -> blue  (before any press)
//   state_after_press_1.png  -> red   (after one press)
//   state_after_press_2.png  -> blue  (after two presses)
//
// Like tool/render_screenshot.dart this draws nothing by hand — it rasterizes
// the live widget tree via RenderRepaintBoundary.toImage(). The capture runs
// inside tester.runAsync() because once a ticker is live (the ink ripple from
// tapping the button) toImage()/toByteData() are driven by the engine's real
// async worker, which the fake-async test clock never pumps — awaiting them
// outside runAsync() would deadlock.
//
// It is launched by tool/../generate_state_screenshots.py via `flutter test`.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hello_world_flutter/main.dart';

Future<void> _loadFonts() async {
  final loader = FontLoader('Roboto')
    ..addFont(rootBundle.load('fonts/Roboto-Regular.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Bold.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Medium.ttf'));
  await loader.load();
}

Future<void> _capture(WidgetTester tester, String name) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byType(RepaintBoundary).first,
  );

  late final ByteData bytes;
  late final int width;
  late final int height;
  await tester.runAsync(() async {
    final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    width = image.width;
    height = image.height;
    bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!;
  });

  final file = File('test/goldens/$name.png');
  file.parent.createSync(recursive: true);
  file.writeAsBytesSync(bytes.buffer.asUint8List());

  // ignore: avoid_print
  print('Rendered ${width}x$height -> ${file.path}');
}

Future<void> _press(WidgetTester tester) async {
  await tester.tap(find.text('change color'));
  // Two pumps, not pumpAndSettle (the ink ripple keeps scheduling frames, so
  // pumpAndSettle would never return). The first frame applies the setState and
  // STARTS the button's implicit foreground-colour animation at t=0; without a
  // second frame the label would still be painted in its pre-tap colour. The
  // second, long pump advances past the ~200ms colour animation and the ripple
  // fade so the next capture shows the fully settled state.
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('render MyApp at each toggle state', (WidgetTester tester) async {
    await _loadFonts();

    await tester.pumpWidget(const RepaintBoundary(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await _capture(tester, 'state_initial'); // blue
    await _press(tester);
    await _capture(tester, 'state_after_press_1'); // red
    await _press(tester);
    await _capture(tester, 'state_after_press_2'); // blue

    // ignore: avoid_print
    print('All states rendered.');
  });
}
