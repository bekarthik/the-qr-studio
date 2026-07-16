import { type ClientOptions, type QrOptions, toParams } from './options.ts';
import { QrResult } from './result.ts';
import { QrStudioError } from './error.ts';

/** Read the `X-QR-Verified` header into a tri-state boolean. */
function readVerified(headers: Headers): boolean | null {
  const v = headers.get('x-qr-verified');
  if (v === null) return null;
  return v.toLowerCase() === 'true';
}

/**
 * Client for the QR Studio API — image-styled, server-verified scannable QR
 * codes as PNG or SVG.
 *
 * ```ts
 * const qr = new QrStudio({ baseUrl: 'https://qr.example.com' });
 * const res = await qr.generate({ data: 'https://example.com', style: 'brand' });
 * res.verified; // true | false | null
 * ```
 */
export class QrStudio {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs?: number;

  constructor(options: ClientOptions) {
    if (!options || typeof options.baseUrl !== 'string' || options.baseUrl.trim() === '') {
      throw new TypeError('QrStudio: `baseUrl` is required (no default host is bundled)');
    }
    // Normalise: strip trailing slash and an optional trailing `/qr`, then
    // rebuild the canonical `/qr` endpoint.
    const trimmed = options.baseUrl.trim().replace(/\/+$/, '');
    const base = trimmed.replace(/\/(?:v1\/)?qr$/, '');
    this.endpoint = `${base}/qr`;

    const f = options.fetch ?? (globalThis.fetch as typeof fetch | undefined);
    if (typeof f !== 'function') {
      throw new TypeError(
        'QrStudio: no `fetch` available. Pass `fetch` in options (Node < 18 has no global fetch).',
      );
    }
    this.fetchImpl = f;
    this.headers = options.headers ?? {};
    this.timeoutMs = options.timeoutMs;
  }

  /**
   * Build a `GET` URL for the given options — handy for `<img src>` or an
   * `Image` where you don't need to read the `X-QR-Verified` header. Note a
   * large `logo` data URL may exceed URL length limits; use {@link generate}
   * (a POST) for those.
   */
  url(options: QrOptions): string {
    const params = new URLSearchParams(toParams(options));
    return `${this.endpoint}?${params.toString()}`;
  }

  /**
   * Generate a QR code. Sends a `POST /qr` with a JSON body (so large logos and
   * all params travel safely) and resolves to a {@link QrResult}.
   * @throws {QrStudioError} on any non-2xx response.
   */
  async generate(options: QrOptions): Promise<QrResult> {
    const params = toParams(options);
    const format = params.format === 'svg' ? 'svg' : 'png';

    let signal: AbortSignal | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (this.timeoutMs !== undefined) {
      const controller = new AbortController();
      signal = controller.signal;
      timer = setTimeout(() => controller.abort(), this.timeoutMs);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers },
        body: JSON.stringify(params),
        signal,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!res.ok) {
      let body: string | undefined;
      let message = `QR Studio request failed with ${res.status}`;
      try {
        body = await res.text();
        const parsed = JSON.parse(body) as { error?: unknown };
        if (parsed && typeof parsed.error === 'string') message = parsed.error;
      } catch {
        // Non-JSON or unreadable body — keep the generic message.
      }
      throw new QrStudioError(message, res.status, body);
    }

    const contentType = res.headers.get('content-type') ?? (format === 'svg' ? 'image/svg+xml' : 'image/png');
    const verified = readVerified(res.headers);
    const buffer = new Uint8Array(await res.arrayBuffer());

    if (format === 'svg') {
      const svg = new TextDecoder().decode(buffer);
      return new QrResult({ format: 'svg', contentType, bytes: buffer, svg, verified });
    }
    return new QrResult({ format: 'png', contentType, bytes: buffer, verified });
  }

  /** Convenience: generate and return the raw PNG bytes. */
  async png(options: Omit<QrOptions, 'format'>): Promise<Uint8Array> {
    const res = await this.generate({ ...options, format: 'png' });
    return res.bytes;
  }

  /** Convenience: generate and return the SVG markup. */
  async svg(options: Omit<QrOptions, 'format'>): Promise<string> {
    const res = await this.generate({ ...options, format: 'svg' });
    return res.svg ?? new TextDecoder().decode(res.bytes);
  }

  /** Convenience: generate and return a `data:` URL. */
  async dataUrl(options: QrOptions): Promise<string> {
    const res = await this.generate(options);
    return res.dataUrl();
  }
}
