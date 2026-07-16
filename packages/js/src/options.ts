/**
 * Option and configuration types for the QR Studio client.
 *
 * These mirror the parameters accepted by the QR Studio API (`GET`/`POST /qr`),
 * kept intentionally self-contained so this package publishes independently.
 * See the API's own validation for the authoritative bounds — the client sends
 * canonical param names and lets the server do the final clamping/rejection.
 */

/** Output image format. */
export type QrFormat = 'png' | 'svg';

/** QR error-correction level (higher = more redundancy, denser code). */
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Module colouring style. `brand` auto-darkens the brand colour to stay scannable. */
export type QrStyle = 'solid' | 'brand';

/** Sub-cells per module — higher renders finer module detail. */
export type SubCells = 3 | 5 | 7;

/** A `#rrggbb` hex colour, e.g. `#1d4ed8`. */
export type HexColor = string;

/**
 * Everything you can ask the QR Studio API to encode and how to style it.
 * Only `data` is required; every other field falls back to the server default.
 */
export interface QrOptions {
  /** Payload to encode (≤ 1200 chars). Required. */
  data: string;
  /** `png` (default) or `svg`. */
  format?: QrFormat;
  /** Error-correction level. Default `H`. */
  ec?: ErrorCorrection;
  /** Foreground (module) colour, `#rrggbb`. Default `#000000`. */
  fg?: HexColor;
  /** Background colour, `#rrggbb`. Default `#ffffff`. */
  bg?: HexColor;
  /** Colour style. Default `solid`. */
  style?: QrStyle;
  /** Brand colour used when `style: 'brand'`. Default `#1d4ed8`. */
  brand?: HexColor;
  /** Output size in px (clamped 64–2048 server-side). Default `512`. */
  size?: number;
  /** Sub-cells per module. Default `3`. */
  sub?: SubCells;
  /** Quiet-zone modules (clamped 0–8 server-side). Default `4`. */
  quiet?: number;
  /**
   * Centre logo as a base64 `data:image/…` URL. Remote URLs are rejected by
   * the server (no SSRF) — pass an inline data URL only.
   */
  logo?: string | null;
  /** Logo box size as a fraction of the QR (clamped 0.1–0.3). Default `0.22`. */
  logoRatio?: number;
  /** Draw a backing plate behind the logo. Default `true`. */
  logoPlate?: boolean;
  /**
   * Ask the server to round-trip decode the render and report the result via
   * the `X-QR-Verified` header (surfaced as {@link QrResult.verified}).
   * Default `true`.
   */
  verify?: boolean;
}

/** Configuration for a {@link QrStudio} client instance. */
export interface ClientOptions {
  /**
   * Base URL of your deployed QR Studio API (the Cloudflare Worker), e.g.
   * `https://qr.example.com`. Required — this package ships no default host.
   * A trailing `/qr` is optional; it is normalised either way.
   */
  baseUrl: string;
  /**
   * `fetch` implementation to use. Defaults to the global `fetch` (Node ≥ 18
   * and all browsers). Inject one for older Node or custom transport.
   */
  fetch?: typeof fetch;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Abort the request after this many milliseconds. Unset = no timeout. */
  timeoutMs?: number;
}

/**
 * Serialise {@link QrOptions} into the flat string map the API expects. Only
 * defined fields are included, so server defaults apply to everything omitted.
 * @internal
 */
export function toParams(o: QrOptions): Record<string, string> {
  if (!o || typeof o.data !== 'string' || o.data === '') {
    throw new TypeError('QrOptions.data is required and must be a non-empty string');
  }
  const p: Record<string, string> = { data: o.data };
  const put = (k: string, v: unknown) => {
    if (v !== undefined && v !== null) p[k] = String(v);
  };
  put('format', o.format);
  put('ec', o.ec);
  put('fg', o.fg);
  put('bg', o.bg);
  put('style', o.style);
  put('brand', o.brand);
  put('size', o.size);
  put('sub', o.sub);
  put('quiet', o.quiet);
  put('logo', o.logo);
  put('logoRatio', o.logoRatio);
  put('logoPlate', o.logoPlate);
  put('verify', o.verify);
  return p;
}
