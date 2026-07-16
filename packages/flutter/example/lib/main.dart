import 'package:flutter/material.dart';
import 'package:qr_studio/qr_studio.dart';

/// Minimal example. Replace [baseUrl] with your deployed QR Studio API.
/// Run the worker locally with `cd worker && npm run dev` (→ http://localhost:8787).
const baseUrl = String.fromEnvironment(
  'QR_STUDIO_BASE_URL',
  defaultValue: 'http://localhost:8787',
);

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QR Studio example',
      home: Scaffold(
        appBar: AppBar(title: const Text('QR Studio')),
        body: Center(
          child: QrStudioImage(
            baseUrl: baseUrl,
            options: const QrOptions(
              data: 'https://theqr.studio',
              style: QrStyle.brand,
              brand: '#0f766e',
              size: 512,
            ),
            width: 256,
            height: 256,
            loadingBuilder: (context) => const CircularProgressIndicator(),
            errorBuilder: (context, error) => Text('Error: $error'),
          ),
        ),
      ),
    );
  }
}
