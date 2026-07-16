import 'dart:typed_data';

import 'package:flutter/widgets.dart';

import 'client.dart';
import 'options.dart';

/// Builder for the error state, given the thrown [error].
typedef QrStudioErrorBuilder = Widget Function(BuildContext context, Object error);

/// A widget that fetches a QR code from the QR Studio API and displays it.
///
/// Provide either a shared [client] or a [baseUrl] (a private client is then
/// created and disposed with the widget). The QR is (re)fetched whenever
/// [options], [client] or [baseUrl] change. The request always uses PNG so the
/// bytes can be drawn with [Image.memory].
///
/// ```dart
/// QrStudioImage(
///   baseUrl: 'https://qr.example.com',
///   options: const QrOptions(data: 'https://example.com', style: QrStyle.brand),
///   width: 240,
///   height: 240,
/// )
/// ```
class QrStudioImage extends StatefulWidget {
  const QrStudioImage({
    super.key,
    this.client,
    this.baseUrl,
    required this.options,
    this.width,
    this.height,
    this.fit,
    this.semanticLabel,
    this.loadingBuilder,
    this.errorBuilder,
    this.gaplessPlayback = true,
  }) : assert(
          client != null || baseUrl != null,
          'Provide either a client or a baseUrl',
        );

  /// A shared client to use. Its lifecycle is owned by the caller.
  final QrStudioClient? client;

  /// Base URL to build a private client from, when [client] is not given.
  final String? baseUrl;

  /// What to encode and how to style it.
  final QrOptions options;

  /// Display width / height in logical pixels.
  final double? width;
  final double? height;

  /// How to inscribe the image into its box.
  final BoxFit? fit;

  /// Accessibility label for the rendered image.
  final String? semanticLabel;

  /// Widget shown while the request is in flight. Defaults to a centred
  /// [SizedBox.shrink]-free empty box sized to [width]/[height].
  final WidgetBuilder? loadingBuilder;

  /// Widget shown if the request fails. Defaults to an empty box.
  final QrStudioErrorBuilder? errorBuilder;

  /// Passed through to [Image.memory] — avoids a flicker when bytes change.
  final bool gaplessPlayback;

  @override
  State<QrStudioImage> createState() => _QrStudioImageState();
}

class _QrStudioImageState extends State<QrStudioImage> {
  /// Client used for fetching — either the supplied one or an internally owned
  /// one that must be closed on dispose.
  QrStudioClient? _ownedClient;
  Future<Uint8List>? _future;

  QrStudioClient get _client {
    if (widget.client != null) return widget.client!;
    return _ownedClient ??= QrStudioClient(baseUrl: widget.baseUrl!);
  }

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void didUpdateWidget(covariant QrStudioImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    final clientChanged = oldWidget.client != widget.client;
    final baseUrlChanged = oldWidget.baseUrl != widget.baseUrl;
    if (clientChanged || baseUrlChanged) {
      // The owned client (if any) was built from the old baseUrl; drop it.
      if (_ownedClient != null && (baseUrlChanged || widget.client != null)) {
        _ownedClient!.close();
        _ownedClient = null;
      }
    }
    if (oldWidget.options != widget.options || clientChanged || baseUrlChanged) {
      _fetch();
    }
  }

  void _fetch() {
    // Force PNG so we always have raster bytes for Image.memory.
    final opts = widget.options.copyWith(format: QrFormat.png);
    setState(() {
      _future = _client.png(opts);
    });
  }

  @override
  void dispose() {
    _ownedClient?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return widget.loadingBuilder?.call(context) ?? _placeholder();
        }
        if (snapshot.hasError) {
          return widget.errorBuilder?.call(context, snapshot.error!) ??
              _placeholder();
        }
        return Image.memory(
          snapshot.data!,
          width: widget.width,
          height: widget.height,
          fit: widget.fit,
          semanticLabel: widget.semanticLabel,
          gaplessPlayback: widget.gaplessPlayback,
        );
      },
    );
  }

  Widget _placeholder() => SizedBox(width: widget.width, height: widget.height);
}
