/// Thrown when the QR Studio API returns a non-2xx response.
class QrStudioException implements Exception {
  QrStudioException(this.message, {required this.statusCode, this.body});

  /// Human-readable message — the API's `error` field when present.
  final String message;

  /// HTTP status code from the API (e.g. 400, 413, 429, 500).
  final int statusCode;

  /// The API's raw response body, when available.
  final String? body;

  @override
  String toString() => 'QrStudioException($statusCode): $message';
}
