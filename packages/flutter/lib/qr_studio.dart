/// A typed Dart client and Flutter widget for the QR Studio API.
///
/// Generate image-styled, server-verified scannable QR codes (PNG or SVG).
/// Requires a deployed QR Studio API (the Cloudflare Worker in the `worker/`
/// directory) — pass its URL as `baseUrl`.
library;

export 'src/client.dart';
export 'src/exceptions.dart';
export 'src/options.dart';
export 'src/result.dart';
export 'src/widget.dart';
