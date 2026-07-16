import type { QrFormat } from './options.ts';

/** Base64-encode raw bytes in both browser and Node without extra deps. */
function bytesToBase64(bytes: Uint8Array): string {
  // Node (and modern runtimes) expose Buffer; prefer it when present.
  const B = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(bytes).toString('base64');
  // Browser fallback via btoa. Chunk to avoid arg-count limits on large images.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * The result of a QR generation request.
 *
 * For `format: 'png'` (the default), {@link QrResult.bytes} holds the raw PNG.
 * For `format: 'svg'`, {@link QrResult.svg} holds the markup (and `bytes` is the
 * UTF-8 encoding of it). {@link QrResult.verified} reflects the server's
 * `X-QR-Verified` header: `true`/`false` when `verify` was on, else `null`.
 */
export class QrResult {
  /** Format of this result. */
  readonly format: QrFormat;
  /** Response `Content-Type` (e.g. `image/png`, `image/svg+xml; charset=utf-8`). */
  readonly contentType: string;
  /** Raw image bytes (PNG bytes, or the UTF-8 bytes of the SVG). */
  readonly bytes: Uint8Array;
  /** SVG markup, present only when `format === 'svg'`. */
  readonly svg?: string;
  /**
   * Server round-trip decode result from `X-QR-Verified`: `true` if the render
   * scanned back to exactly the payload, `false` if not, `null` if `verify`
   * was disabled (header absent).
   */
  readonly verified: boolean | null;

  constructor(init: {
    format: QrFormat;
    contentType: string;
    bytes: Uint8Array;
    svg?: string;
    verified: boolean | null;
  }) {
    this.format = init.format;
    this.contentType = init.contentType;
    this.bytes = init.bytes;
    this.svg = init.svg;
    this.verified = init.verified;
  }

  /** The underlying bytes as an `ArrayBuffer`. */
  arrayBuffer(): ArrayBuffer {
    return this.bytes.buffer.slice(
      this.bytes.byteOffset,
      this.bytes.byteOffset + this.bytes.byteLength,
    ) as ArrayBuffer;
  }

  /** A `Blob` tagged with the response content type (browser & Node ≥ 18). */
  blob(): Blob {
    return new Blob([this.arrayBuffer()], { type: this.contentType });
  }

  /** A `data:` URL suitable for an `<img src>` or CSS background. */
  dataUrl(): string {
    const mime = this.contentType.split(';')[0].trim() || 'application/octet-stream';
    if (this.format === 'svg' && this.svg !== undefined) {
      return `data:${mime};base64,${bytesToBase64(new TextEncoder().encode(this.svg))}`;
    }
    return `data:${mime};base64,${bytesToBase64(this.bytes)}`;
  }
}
