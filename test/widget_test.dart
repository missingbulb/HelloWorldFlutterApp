import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hello_world_flutter/main.dart';

void main() {
  testWidgets('App renders hello world with orange background and hi button',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('hello world'), findsOneWidget);
    expect(find.text('hi!'), findsOneWidget);

    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.orange);
  });

  testWidgets('Screenshot - initial screen', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MyApp),
      matchesGoldenFile('goldens/initial_screen.png'),
    );
  });
}
