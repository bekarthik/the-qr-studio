import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qr_studio/qr_studio.dart';

// A 4-byte PNG magic header is enough to assert byte plumbing.
final _png = [0x89, 0x50, 0x4e, 0x47];

void main() {
  test('requires a non-empty baseUrl', () {
    expect(() => QrStudioClient(baseUrl: ''), throwsArgumentError);
    expect(() => QrStudioClient(baseUrl: '   '), throwsArgumentError);
  });

  test('normalises baseUrl (trailing slash and /qr suffix) to one /qr endpoint',
      () {
    for (final base in [
      'https://x.dev',
      'https://x.dev/',
      'https://x.dev/qr',
      'https://x.dev/v1/qr',
    ]) {
      final client = QrStudioClient(baseUrl: base);
      expect(client.endpoint.toString(), 'https://x.dev/qr');
      client.close();
    }
  });

  test('buildUri serialises only provided options', () {
    final client = QrStudioClient(baseUrl: 'https://x.dev');
    final uri = client.buildUri(const QrOptions(
      data: 'https://example.com',
      style: QrStyle.brand,
      size: 320,
    ));
    expect(uri.queryParameters['data'], 'https://example.com');
    expect(uri.queryParameters['style'], 'brand');
    expect(uri.queryParameters['size'], '320');
    expect(uri.queryParameters.containsKey('ec'), isFalse);
    client.close();
  });

  test('toParams maps enums to wire values', () {
    final params = const QrOptions(
      data: 'hi',
      format: QrFormat.svg,
      ec: ErrorCorrection.q,
      style: QrStyle.brand,
      verify: false,
      logoPlate: true,
    ).toParams();
    expect(params['format'], 'svg');
    expect(params['ec'], 'Q');
    expect(params['style'], 'brand');
    expect(params['verify'], 'false');
    expect(params['logoPlate'], 'true');
  });

  test('generate POSTs JSON and parses PNG + verified header', () async {
    late http.Request captured;
    final mock = MockClient((req) async {
      captured = req;
      return http.Response.bytes(
        _png,
        200,
        headers: {'content-type': 'image/png', 'x-qr-verified': 'true'},
      );
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);

    final res = await client.generate(const QrOptions(data: 'hi', verify: true));

    expect(captured.method, 'POST');
    expect(captured.url.toString(), 'https://x.dev/qr');
    expect(captured.headers['content-type'], contains('application/json'));
    expect(jsonDecode(captured.body), {'data': 'hi', 'verify': 'true'});

    expect(res.format, QrFormat.png);
    expect(res.verified, isTrue);
    expect(res.bytes.sublist(0, 4), _png);
  });

  test('verified is null when the header is absent', () async {
    final mock = MockClient((req) async {
      return http.Response.bytes(_png, 200, headers: {'content-type': 'image/png'});
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);
    final res = await client.generate(const QrOptions(data: 'hi', verify: false));
    expect(res.verified, isNull);
  });

  test('svg() returns markup', () async {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    final mock = MockClient((req) async {
      return http.Response(
        svg,
        200,
        headers: {'content-type': 'image/svg+xml; charset=utf-8'},
      );
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);
    final out = await client.svg(const QrOptions(data: 'hi'));
    expect(out, svg);
  });

  test('non-2xx throws QrStudioException with the API error message', () async {
    final mock = MockClient((req) async {
      return http.Response(
        jsonEncode({'error': '`data` is required'}),
        400,
        headers: {'content-type': 'application/json'},
      );
    });
    final client = QrStudioClient(baseUrl: 'https://x.dev', httpClient: mock);
    expect(
      () => client.generate(const QrOptions(data: 'x')),
      throwsA(isA<QrStudioException>()
          .having((e) => e.statusCode, 'statusCode', 400)
          .having((e) => e.message, 'message', '`data` is required')),
    );
  });

  test('empty data throws before any request', () {
    final client = QrStudioClient(baseUrl: 'https://x.dev');
    expect(() => client.buildUri(const QrOptions(data: '')), throwsArgumentError);
    client.close();
  });
}
