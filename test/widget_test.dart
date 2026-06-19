import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hello_world_flutter/main.dart';

Future<void> loadFonts() async {
  final fontLoader = FontLoader('Roboto')
    ..addFont(rootBundle.load('fonts/Roboto-Regular.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Bold.ttf'))
    ..addFont(rootBundle.load('fonts/Roboto-Medium.ttf'));
  await fontLoader.load();
}

void main() {
  testWidgets('App renders hello world with blue background and change color button',
      (WidgetTester tester) async {
    await loadFonts();
    await tester.pumpWidget(const MyApp());

    expect(find.text('hello world'), findsOneWidget);
    expect(find.text('change color'), findsOneWidget);

    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.blue);
  });

  testWidgets('App turns red after the change color button is pressed once',
      (WidgetTester tester) async {
    await loadFonts();
    await tester.pumpWidget(const MyApp());

    // Sanity check: starts blue.
    Scaffold scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.blue);

    // Press the button once.
    await tester.tap(find.text('change color'));
    await tester.pumpAndSettle();

    // The screen should now be red and the label should name the new colour.
    expect(find.text('hello world red'), findsOneWidget);
    expect(find.text('change color'), findsOneWidget);

    scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.red);

    // The button foreground colour follows the background colour.
    final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(
      button.style?.foregroundColor?.resolve(<MaterialState>{}),
      Colors.red,
    );
  });

  testWidgets('App returns to blue after the change color button is pressed twice',
      (WidgetTester tester) async {
    await loadFonts();
    await tester.pumpWidget(const MyApp());

    // Sanity check: starts blue.
    Scaffold scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.blue);

    // Press once -> red.
    await tester.tap(find.text('change color'));
    await tester.pumpAndSettle();
    scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.red);

    // Press again -> back to blue.
    await tester.tap(find.text('change color'));
    await tester.pumpAndSettle();

    // The screen should be blue again and the label should name the new colour.
    expect(find.text('hello world blue'), findsOneWidget);
    expect(find.text('change color'), findsOneWidget);

    scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.blue);

    // The button foreground colour follows the background colour.
    final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(
      button.style?.foregroundColor?.resolve(<MaterialState>{}),
      Colors.blue,
    );
  });
}
