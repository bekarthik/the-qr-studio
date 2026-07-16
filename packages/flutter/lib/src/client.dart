import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'exceptions.dart';
import 'options.dart';
import 'result.dart';

/// Client for the QR Studio API — image-styled, server-verified scannable QR
/// codes as PNG or SVG.
///
/// ```dart
/// final client = QrStudioClient(baseUrl: 'https://qr.example.com');
/// final res = await client.generate(
///   const QrOptions(data: 'https://example.com', style: QrStyle.brand),
/// );
/// res.verified; // true | false | null
/// client.close();
/// ```
///
/// This client depends only on `package:http` and works on any Dart platform.
class QrStudioClient {
  /// Creates a client pointed at your deployed QR Studio API ([baseUrl]).
  ///
  /// This package ships no default host. A trailing `/qr` (or `/v1/qr`) on
  /// [baseUrl] is optional; it is normalised either way. Pass a custom
  /// [httpClient] to reuse a connection pool or to inject a mock in tests;
  /// otherwise an internal client is created and closed by [close].
  QrStudioClient({
    required String baseUrl,
    http.Client? httpClient,
    Map<String, String>? headers,
  })  : _headers = headers ?? const {},
        _ownsClient = httpClient == null,
        _client = httpClient ?? http.Client() {
    final trimmed = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (trimmed.isEmpty) {
      throw ArgumentError.value(baseUrl, 'baseUrl', 'must not be empty');
    }
    final base = trimmed.replaceAll(RegExp(r'/(?:v1/)?qr$'), '');
    endpoint = Uri.parse('$base/qr');
  }

  /// The canonical `/qr` endpoint derived from `baseUrl`.
  late final Uri endpoint;

  final http.Client _client;
  final bool _ownsClient;
  final Map<String, String> _headers;

  /// Build a `GET` [Uri] for the given options — handy for a URL-based image
  /// loader when you don't need to read the `X-QR-Verified` header. A large
  /// `logo` data URL may exceed URL-length limits; use [generate] for those.
  Uri buildUri(QrOptions options) {
    return endpoint.replace(queryParameters: options.toParams());
  }

  /// Generate a QR code via `POST /qr` and resolve to a [QrResult].
  ///
  /// Throws a [QrStudioException] on any non-2xx response.
  Future<QrResult> generate(QrOptions options) async {
    final params = options.toParams();
    final res = await _client.post(
      endpoint,
      headers: {
        'content-type': 'application/json',
        ..._headers,
      },
      body: jsonEncode(params),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      var message = 'QR Studio request failed with ${res.statusCode}';
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded['error'] is String) {
          message = decoded['error'] as String;
        }
      } catch (_) {
        // Non-JSON or unreadable body — keep the generic message.
      }
      throw QrStudioException(message, statusCode: res.statusCode, body: res.body);
    }

    final verifiedHeader = res.headers['x-qr-verified'];
    final verified =
        verifiedHeader == null ? null : verifiedHeader.toLowerCase() == 'true';
    final isSvg = options.format == QrFormat.svg;
    final contentType =
        res.headers['content-type'] ?? (isSvg ? 'image/svg+xml' : 'image/png');
    final Uint8List bytes = res.bodyBytes;

    if (isSvg) {
      return QrResult(
        format: QrFormat.svg,
        bytes: bytes,
        svg: utf8.decode(bytes),
        contentType: contentType,
        verified: verified,
      );
    }
    return QrResult(
      format: QrFormat.png,
      bytes: bytes,
      contentType: contentType,
      verified: verified,
    );
  }

  /// Convenience: generate and return the raw PNG bytes.
  Future<Uint8List> png(QrOptions options) async {
    final res = await generate(options.copyWith(format: QrFormat.png));
    return res.bytes;
  }

  /// Convenience: generate and return the SVG markup.
  Future<String> svg(QrOptions options) async {
    final res = await generate(options.copyWith(format: QrFormat.svg));
    return res.svg ?? utf8.decode(res.bytes);
  }

  /// Close the underlying HTTP client if this instance created it. No-op when an
  /// external `httpClient` was supplied (you own its lifecycle).
  void close() {
    if (_ownsClient) _client.close();
  }
}
