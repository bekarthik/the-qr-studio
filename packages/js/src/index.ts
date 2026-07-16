/**
 * @theqr.studio/qr — a tiny, typed client for the QR Studio API.
 *
 * Generate image-styled, server-verified scannable QR codes (PNG or SVG) from
 * the browser or Node. Requires a deployed QR Studio API (the Cloudflare Worker
 * in the `worker/` directory) — pass its URL as `baseUrl`.
 */
export { QrStudio } from './client.ts';
export { QrResult } from './result.ts';
export { QrStudioError } from './error.ts';
export type {
  QrOptions,
  ClientOptions,
  QrFormat,
  ErrorCorrection,
  QrStyle,
  SubCells,
  HexColor,
} from './options.ts';
