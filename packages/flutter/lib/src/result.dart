import 'dart:typed_data';

import 'package:meta/meta.dart';

import 'options.dart';

/// The result of a QR generation request.
///
/// For [QrFormat.png] (the default), [bytes] holds the raw PNG. For
/// [QrFormat.svg], [svg] holds the markup (and [bytes] is its UTF-8 encoding).
/// [verified] reflects the server's `X-QR-Verified` header: `true`/`false` when
/// `verify` was on, or `null` when it was disabled (header absent).
@immutable
class QrResult {
  const QrResult({
    required this.format,
    required this.bytes,
    required this.contentType,
    required this.verified,
    this.svg,
  });

  /// Format of this result.
  final QrFormat format;

  /// Raw image bytes (PNG bytes, or the UTF-8 bytes of the SVG).
  final Uint8List bytes;

  /// Response `Content-Type` (e.g. `image/png`, `image/svg+xml; charset=utf-8`).
  final String contentType;

  /// Server round-trip decode result from `X-QR-Verified`: `true` if the render
  /// scanned back to exactly the payload, `false` if not, `null` if `verify`
  /// was disabled.
  final bool? verified;

  /// SVG markup, present only when [format] is [QrFormat.svg].
  final String? svg;
}
