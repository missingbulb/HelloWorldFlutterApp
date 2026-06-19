import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hello World',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // The screen starts blue. Pressing the button cycles blue -> red -> purple ->
  // blue and, once pressed, the label names the new colour ("hello world red" /
  // "hello world purple" / "hello world blue") so each state is distinguishable.
  // Ordered colour cycle and matching label names (kept in lockstep by index).
  static const List<Color> _cycle = <Color>[
    Colors.blue,
    Colors.red,
    Colors.purple,
  ];
  static const List<String> _colorNames = <String>['blue', 'red', 'purple'];

  int _colorIndex = 0;
  Color get _backgroundColor => _cycle[_colorIndex];
  String _label = 'hello world';

  void _toggleColor() {
    setState(() {
      _colorIndex = (_colorIndex + 1) % _cycle.length;
      _label = 'hello world ${_colorNames[_colorIndex]}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _backgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _label,
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _toggleColor,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _backgroundColor,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                textStyle: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Roboto',
                ),
              ),
              child: const Text('change color'),
            ),
          ],
        ),
      ),
    );
  }
}
