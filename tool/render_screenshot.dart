// Renders the real application (lib/main.dart -> MyApp) to a PNG using
// Flutter's own rendering engine and writes it to test/goldens/initial_screen.png.
//
// This file does NOT draw anything by hand. It boots MyApp inside the
// flutter_test rendering pipeline (the same engine the app uses on a device),
// then rasterizes the live widget tree via RenderRepaintBoundary.toImage().
// The pixels written to disk are produced by the engine, not by code.
//
// It is launched by tool/../generate_screenshot.py via `flutter test`.
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

void main() {
  testWidgets('render MyApp to PNG via the engine', (WidgetTester tester) async {
    await _loadFonts();

    // Pump the actual app widget from main.dart, wrapped in a RepaintBoundary
    // so we have a layer the engine can rasterize.
    await tester.pumpWidget(
      const RepaintBoundary(child: MyApp()),
    );
    await tester.pumpAndSettle();

    // Rasterize the live render tree through the engine.
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byType(RepaintBoundary).first,
    );
    final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    final ByteData? bytes =
        await image.toByteData(format: ui.ImageByteFormat.png);

    final file = File('test/goldens/initial_screen.png');
    file.parent.createSync(recursive: true);
    file.writeAsBytesSync(bytes!.buffer.asUint8List());

    // ignore: avoid_print
    print('Rendered ${image.width}x${image.height} -> ${file.path}');
  });
}
