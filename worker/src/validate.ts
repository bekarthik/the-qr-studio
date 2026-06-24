/**
 * Input parsing, validation and clamping for the QR service.
 *
 * Every untrusted value is range-checked or rejected here so the render path
 * only ever sees safe, bounded inputs. This is the first line of abuse defence:
 * bounded text length, bounded output size, hex-only colours and data-URL-only
 * logos (never a remote URL, so the Worker can't be turned into an SSRF proxy).
 */
import type { ErrorLevel } from '../../src/qr/matrix';
import type { ColorStyle } from '../../src/qr/grid';

export interface QrRequest {
  data: string;
  format: 'png' | 'svg';
  ec: ErrorLevel;
  fg: string;
  bg: string;
  style: Extract<ColorStyle, 'solid' | 'brand'>;
  brand: string;
  sub: 3 | 5 | 7;
  size: number;
  quiet: number;
  logo: string | null;
  logoRatio: number;
  logoPlate: boolean;
  verify: boolean;
}

export class ValidationError extends Error {}

// Hard limits. Text well under QR's H-level capacity; size capped so a single
// request can never ask the Worker to rasterise an enormous image.
const MAX_DATA = 1200;
const MIN_SIZE = 64;
const MAX_SIZE = 2048;
// ~200 KB of base64 ≈ a 150 KB logo. Big enough for a real logo, small enough
// that a flood of logo requests can't exhaust Worker memory/CPU.
const MAX_LOGO_CHARS = 280_000;

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATA_IMG = /^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function pick(src: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (src[k] !== undefined && src[k] !== null) return src[k];
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  throw new ValidationError('Expected a string value');
}

function asBool(v: unknown, dflt: boolean): boolean {
  if (v === undefined) return dflt;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return dflt;
}

function hex(v: unknown, dflt: string, field: string): string {
  const s = asString(v);
  if (s === undefined) return dflt;
  if (!HEX.test(s)) throw new ValidationError(`${field} must be a #rrggbb hex colour`);
  return s.toLowerCase();
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number, field: string): number {
  const s = asString(v);
  if (s === undefined) return dflt;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/**
 * Merge query params and JSON body into one validated request. Body values win
 * over query so a POST can override defaults cleanly.
 */
export function parseRequest(query: URLSearchParams, body: Record<string, unknown>): QrRequest {
  const src: Record<string, unknown> = {};
  for (const [k, v] of query.entries()) src[k] = v;
  Object.assign(src, body); // body overrides query

  const data = asString(pick(src, 'data', 'text', 'content'));
  if (data === undefined || data === '') throw new ValidationError('`data` is required');
  if (data.length > MAX_DATA) throw new ValidationError(`\`data\` exceeds ${MAX_DATA} characters`);

  const format = (asString(pick(src, 'format')) ?? 'png').toLowerCase();
  if (format !== 'png' && format !== 'svg') throw new ValidationError('`format` must be png or svg');

  const ec = (asString(pick(src, 'ec', 'errorLevel')) ?? 'H').toUpperCase();
  if (!['L', 'M', 'Q', 'H'].includes(ec)) throw new ValidationError('`ec` must be L, M, Q or H');

  const style = (asString(pick(src, 'style')) ?? 'solid').toLowerCase();
  if (style !== 'solid' && style !== 'brand') {
    throw new ValidationError('`style` must be solid or brand');
  }

  const subRaw = clampInt(pick(src, 'sub'), 3, 7, 3, 'sub');
  const sub = (subRaw <= 3 ? 3 : subRaw <= 5 ? 5 : 7) as 3 | 5 | 7;

  let logo: string | null = null;
  const logoRaw = asString(pick(src, 'logo', 'image'));
  if (logoRaw) {
    if (logoRaw.length > MAX_LOGO_CHARS) throw new ValidationError('`logo` data URL is too large');
    if (!DATA_IMG.test(logoRaw)) {
      throw new ValidationError('`logo` must be a base64 data:image/... URL (remote URLs are not allowed)');
    }
    logo = logoRaw;
  }

  return {
    data,
    format,
    ec: ec as ErrorLevel,
    fg: hex(pick(src, 'fg', 'color'), '#000000', 'fg'),
    bg: hex(pick(src, 'bg', 'background'), '#ffffff', 'bg'),
    style: style as 'solid' | 'brand',
    brand: hex(pick(src, 'brand', 'brandColor'), '#1d4ed8', 'brand'),
    sub,
    size: clampInt(pick(src, 'size', 'pixelSize'), MIN_SIZE, MAX_SIZE, 512, 'size'),
    quiet: clampInt(pick(src, 'quiet', 'quietModules'), 0, 8, 4, 'quiet'),
    logo,
    logoRatio: Math.min(0.3, Math.max(0.1, Number(asString(pick(src, 'logoRatio')) ?? 0.22) || 0.22)),
    logoPlate: asBool(pick(src, 'logoPlate'), true),
    verify: asBool(pick(src, 'verify'), true),
  };
}
