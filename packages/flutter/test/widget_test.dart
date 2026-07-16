import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qr_studio/qr_studio.dart';

// A minimal 1x1 transparent PNG so Image.memory can decode real bytes.
final _tinyPng = <int>[
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

void main() {
  testWidgets('renders an Image once bytes arrive', (tester) async {
    final mock = MockClient((req) async {
      return http.Response.bytes(_tinyPng, 200,
          headers: {'content-type': 'image/png'});
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: QrStudioImage(
          client: client,
          options: const QrOptions(data: 'https://example.com'),
          width: 100,
          height: 100,
        ),
      ),
    );

    // Let the future complete and the image decode.
    await tester.pumpAndSettle();
    expect(find.byType(Image), findsOneWidget);
  });

  testWidgets('shows errorBuilder on a failed request', (tester) async {
    final mock = MockClient((req) async {
      return http.Response('{"error":"nope"}', 400,
          headers: {'content-type': 'application/json'});
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: QrStudioImage(
          client: client,
          options: const QrOptions(data: 'https://example.com'),
          errorBuilder: (context, error) => const Text('failed'),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('failed'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });
}
