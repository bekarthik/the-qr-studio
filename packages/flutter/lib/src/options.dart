import 'package:meta/meta.dart';

/// Output image format.
enum QrFormat {
  png,
  svg;

  /// The wire value expected by the API.
  String get wire => name;
}

/// QR error-correction level (higher = more redundancy, denser code).
enum ErrorCorrection {
  l,
  m,
  q,
  h;

  /// The wire value expected by the API (upper-case `L`/`M`/`Q`/`H`).
  String get wire => name.toUpperCase();
}

/// Module colouring style. `brand` auto-darkens the brand colour to stay
/// scannable.
enum QrStyle {
  solid,
  brand;

  /// The wire value expected by the API.
  String get wire => name;
}

/// Everything you can ask the QR Studio API to encode and how to style it.
///
/// Only [data] is required; every other field falls back to the server default,
/// so omitted values are simply not sent.
@immutable
class QrOptions {
  const QrOptions({
    required this.data,
    this.format,
    this.ec,
    this.fg,
    this.bg,
    this.style,
    this.brand,
    this.size,
    this.sub,
    this.quiet,
    this.logo,
    this.logoRatio,
    this.logoPlate,
    this.verify,
  });

  /// Payload to encode (≤ 1200 chars). Required.
  final String data;

  /// `png` (default) or `svg`.
  final QrFormat? format;

  /// Error-correction level. Default `H`.
  final ErrorCorrection? ec;

  /// Foreground (module) colour, `#rrggbb`. Default `#000000`.
  final String? fg;

  /// Background colour, `#rrggbb`. Default `#ffffff`.
  final String? bg;

  /// Colour style. Default `solid`.
  final QrStyle? style;

  /// Brand colour used when [style] is [QrStyle.brand]. Default `#1d4ed8`.
  final String? brand;

  /// Output size in px (clamped 64–2048 server-side). Default `512`.
  final int? size;

  /// Sub-cells per module: 3, 5 or 7. Default `3`.
  final int? sub;

  /// Quiet-zone modules (clamped 0–8 server-side). Default `4`.
  final int? quiet;

  /// Centre logo as a base64 `data:image/…` URL. Remote URLs are rejected by
  /// the server (no SSRF) — pass an inline data URL only.
  final String? logo;

  /// Logo box size as a fraction of the QR (clamped 0.1–0.3). Default `0.22`.
  final double? logoRatio;

  /// Draw a backing plate behind the logo. Default `true`.
  final bool? logoPlate;

  /// Ask the server to round-trip decode the render and report the result via
  /// the `X-QR-Verified` header (surfaced as `QrResult.verified`). Default
  /// `true`.
  final bool? verify;

  /// Serialise into the flat string map the API expects. Only non-null fields
  /// are included, so server defaults apply to everything omitted.
  Map<String, String> toParams() {
    if (data.isEmpty) {
      throw ArgumentError.value(data, 'data', 'must be a non-empty string');
    }
    final params = <String, String>{'data': data};
    void put(String key, Object? value) {
      if (value != null) params[key] = '$value';
    }

    put('format', format?.wire);
    put('ec', ec?.wire);
    put('fg', fg);
    put('bg', bg);
    put('style', style?.wire);
    put('brand', brand);
    put('size', size);
    put('sub', sub);
    put('quiet', quiet);
    put('logo', logo);
    put('logoRatio', logoRatio);
    put('logoPlate', logoPlate);
    put('verify', verify);
    return params;
  }

  /// Returns a copy with the given fields overridden.
  QrOptions copyWith({
    String? data,
    QrFormat? format,
    ErrorCorrection? ec,
    String? fg,
    String? bg,
    QrStyle? style,
    String? brand,
    int? size,
    int? sub,
    int? quiet,
    String? logo,
    double? logoRatio,
    bool? logoPlate,
    bool? verify,
  }) {
    return QrOptions(
      data: data ?? this.data,
      format: format ?? this.format,
      ec: ec ?? this.ec,
      fg: fg ?? this.fg,
      bg: bg ?? this.bg,
      style: style ?? this.style,
      brand: brand ?? this.brand,
      size: size ?? this.size,
      sub: sub ?? this.sub,
      quiet: quiet ?? this.quiet,
      logo: logo ?? this.logo,
      logoRatio: logoRatio ?? this.logoRatio,
      logoPlate: logoPlate ?? this.logoPlate,
      verify: verify ?? this.verify,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is QrOptions &&
        other.data == data &&
        other.format == format &&
        other.ec == ec &&
        other.fg == fg &&
        other.bg == bg &&
        other.style == style &&
        other.brand == brand &&
        other.size == size &&
        other.sub == sub &&
        other.quiet == quiet &&
        other.logo == logo &&
        other.logoRatio == logoRatio &&
        other.logoPlate == logoPlate &&
        other.verify == verify;
  }

  @override
  int get hashCode => Object.hashAll([
        data,
        format,
        ec,
        fg,
        bg,
        style,
        brand,
        size,
        sub,
        quiet,
        logo,
        logoRatio,
        logoPlate,
        verify,
      ]);
}
