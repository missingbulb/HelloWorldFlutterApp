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
  testWidgets('App renders hello world with orange background and hi button',
      (WidgetTester tester) async {
    await loadFonts();
    await tester.pumpWidget(const MyApp());

    expect(find.text('hello world'), findsOneWidget);
    expect(find.text('hi!'), findsOneWidget);

    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.orange);
  });
}
