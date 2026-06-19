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
  // The screen starts blue. Pressing the button toggles blue <-> red and, once
  // pressed, the label names the new colour ("hello world red" / "hello world
  // blue") so each state is distinguishable.
  Color _backgroundColor = Colors.blue;
  String _label = 'hello world';

  void _toggleColor() {
    setState(() {
      _backgroundColor =
          _backgroundColor == Colors.blue ? Colors.red : Colors.blue;
      final String colorName =
          _backgroundColor == Colors.blue ? 'blue' : 'red';
      _label = 'hello world $colorName';
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
