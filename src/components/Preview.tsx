import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useGen, roleImage, primaryImage, type Config } from '../state/GeneratorContext';
import { buildPayload } from '../content/payloads';
import { buildMatrix, type QrMatrix } from '../qr/matrix';
import { sampleImage, extractBrandColor, type ImageSampler } from '../qr/halftone';
import { renderQR } from '../qr/render';
import { renderSVG } from '../qr/svg';

const RES = 1600;
export type BadgeState = 'hidden' | 'checking' | 'ok' | 'fail';

interface Snapshot {
  matrix: QrMatrix;
  sampler: ImageSampler | null;
  fg: string;
  bg: string;
  protectPatterns: boolean;
  colorStyle: 'solid' | 'brand' | 'image';
  shape: Config['shape'];
  eyeShape: Config['eyeShape'];
  eyeColor: string | null;
  brandColor: string;
  sub: number;
  dotScale: number;
  centerHref: string | null;
  watermark: { href: string; opacity: number; position: 'across' | 'br' } | null;
}

const BADGE_TEXT: Record<BadgeState, string> = {
  hidden: '',
  checking: 'Checking scannability…',
  ok: '✓ Verified scannable',
  fail: '⚠ May not scan — lower detail/dot size or raise contrast',
};

/**
 * jsQR at full resolution is far stricter than a phone camera: on a halftone
 * code the per-module speckle trips it even when the code scans fine in the real
 * world. A phone optically downsamples, which averages that speckle away — so we
 * decode the canvas AND a few smoothed downscales and accept if any reads. This
 * removes the false "May not scan" while still catching genuinely broken codes.
 */
function decodesAtAnyScale(canvas: HTMLCanvasElement, payload: string, strict: boolean): boolean {
  const tryDecode = (cv: HTMLCanvasElement): boolean => {
    const cx = cv.getContext('2d');
    if (!cx) return false;
    try {
      const d = cx.getImageData(0, 0, cv.width, cv.height);
      const res = jsQR(d.data, cv.width, cv.height);
      return res != null && res.data === payload;
    } catch {
      return false;
    }
  };
  const full = tryDecode(canvas);
  // Studio-grade: must decode at full resolution, no camera-style help.
  if (strict) return full;
  if (full) return true;
  for (const w of [820, 600, 440, 320]) {
    if (w >= canvas.width) continue;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.max(1, Math.round((canvas.height / canvas.width) * w));
    const cx = c.getContext('2d');
    if (!cx) continue;
    cx.imageSmoothingEnabled = true; // bilinear blur ≈ a camera averaging the halftone
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(canvas, 0, 0, c.width, c.height);
    if (tryDecode(c)) return true;
  }
  return false;
}

function message(holder: HTMLElement, text: string, isErr: boolean, detail?: string) {
  const d = document.createElement('div');
  d.className = 'empty' + (isErr ? ' err' : '');
  d.textContent = text;
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    d.append(document.createElement('br'), small);
  }
  holder.replaceChildren(d);
}

/** Export hooks handed up to the Workstation chrome (top-bar Export menu and
 *  status-bar quick buttons) so download actions live in the frame, not the
 *  canvas. */
export interface ExportApi {
  png: () => void;
  svg: () => void;
  ready: boolean;
}

export function Preview({
  onStatus,
  registerExport,
}: {
  onStatus?: (s: BadgeState) => void;
  registerExport?: (api: ExportApi) => void;
} = {}) {
  const { cfg } = useGen();
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<Snapshot | null>(null);
  const [badge, setBadge] = useState<BadgeState>('hidden');
  const [hint, setHint] = useState('');
  const [ready, setReady] = useState(false);

  // Report verify state up so the Workstation bar can mirror it.
  useEffect(() => {
    onStatus?.(badge);
  }, [badge, onStatus]);

  useEffect(() => {
    const h = holder.current;
    if (!h) return;

    const payload = buildPayload(cfg.type, cfg.values[cfg.type]);
    if (!payload) {
      message(h, 'Fill in the details to generate a QR code.', false);
      canvasRef.current = null;
      snapRef.current = null;
      setReady(false);
      setBadge('hidden');
      setHint('');
      return;
    }

    const errorLevel = cfg.resemble || cfg.embed ? 'H' : cfg.errorLevel;
    let matrix: QrMatrix;
    try {
      matrix = buildMatrix(payload, errorLevel);
    } catch (err) {
      message(h, 'Too much data for one QR code.', true, (err as Error).message);
      canvasRef.current = null;
      snapRef.current = null;
      setReady(false);
      setBadge('hidden');
      setHint('');
      return;
    }

    const detail = cfg.detail;
    const smooth = detail >= 5 ? 1 : 0;
    const eyeColorOverride = cfg.autoEyeColor ? null : cfg.eyeColor;
    const brandImg = primaryImage(cfg);
    const brandColor =
      cfg.autoBrand && brandImg && cfg.colorStyle === 'brand'
        ? extractBrandColor(brandImg, brandImg.naturalWidth, brandImg.naturalHeight)
        : cfg.brandColor;

    const halftoneImg = roleImage(cfg, 'halftone');
    const logoImg = roleImage(cfg, 'logo');
    const watermarkImg = roleImage(cfg, 'watermark');

    const sampler: ImageSampler | null =
      cfg.resemble && halftoneImg
        ? sampleImage(halftoneImg, halftoneImg.naturalWidth, halftoneImg.naturalHeight, {
            gridSize: matrix.size * detail,
            threshold: cfg.threshold,
            invert: cfg.invert,
            auto: cfg.autoThreshold,
            smooth,
          })
        : null;

    const centerImage =
      cfg.embed && logoImg
        ? {
            source: logoImg,
            width: logoImg.naturalWidth,
            height: logoImg.naturalHeight,
            ratio: cfg.logoRatio,
            plate: cfg.plate,
            position: cfg.embedPos,
          }
        : null;

    const watermark =
      cfg.watermark && watermarkImg
        ? {
            source: watermarkImg,
            width: watermarkImg.naturalWidth,
            height: watermarkImg.naturalHeight,
            opacity: cfg.watermarkOpacity,
            position: cfg.watermarkPos,
          }
        : null;

    const canvas = renderQR({
      matrix,
      targetPx: RES,
      quietModules: 4,
      fg: cfg.fg,
      bg: cfg.bg,
      sampler,
      protectPatterns: cfg.protectPatterns,
      colorStyle: cfg.colorStyle,
      brandColor,
      sub: detail,
      core: 0,
      dotScale: cfg.dotSize,
      shape: cfg.shape,
      eyeShape: cfg.eyeShape,
      eyeColor: eyeColorOverride,
      watermark,
      centerImage,
    });
    canvas.className = 'qr';
    h.replaceChildren(canvas);
    canvasRef.current = canvas;
    snapRef.current = {
      matrix,
      sampler,
      fg: cfg.fg,
      bg: cfg.bg,
      protectPatterns: cfg.protectPatterns,
      colorStyle: cfg.colorStyle,
      shape: cfg.shape,
      eyeShape: cfg.eyeShape,
      eyeColor: eyeColorOverride,
      brandColor,
      sub: detail,
      dotScale: cfg.dotSize,
      centerHref: centerImage && logoImg ? logoImg.src : null,
      watermark: watermark && watermarkImg ? { href: watermarkImg.src, opacity: cfg.watermarkOpacity, position: cfg.watermarkPos } : null,
    };
    setReady(true);

    const useImage =
      (cfg.resemble && halftoneImg) || (cfg.embed && logoImg) || (cfg.watermark && watermarkImg);
    setHint(
      useImage
        ? 'Tip: image-styled codes use maximum error correction. Always test-scan before printing; lower the detail / dot size or logo size if a phone struggles.'
        : `Version ${matrix.version} · ${matrix.size}×${matrix.size} modules · error correction ${errorLevel}.`,
    );

    // Verify off the critical path so typing stays smooth.
    setBadge('checking');
    const timer = setTimeout(() => {
      setBadge(decodesAtAnyScale(canvas, payload, cfg.strictVerify) ? 'ok' : 'fail');
    }, 160);
    return () => clearTimeout(timer);
  }, [cfg]);

  const save = (blob: Blob, ext: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${cfg.type}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPng = () => {
    canvasRef.current?.toBlob((b) => b && save(b, 'png'), 'image/png');
  };

  const downloadSvg = () => {
    const s = snapRef.current;
    if (!s) return;
    const svg = renderSVG({
      matrix: s.matrix,
      quietModules: 4,
      fg: s.fg,
      bg: s.bg,
      sampler: s.sampler,
      protectPatterns: s.protectPatterns,
      colorStyle: s.colorStyle,
      brandColor: s.brandColor,
      sub: s.sub,
      core: 0,
      dotScale: s.dotScale,
      shape: s.shape,
      eyeShape: s.eyeShape,
      eyeColor: s.eyeColor,
      watermark: s.watermark,
      centerImage: s.centerHref ? { href: s.centerHref, ratio: cfg.logoRatio, plate: cfg.plate, position: cfg.embedPos } : null,
      pixelSize: RES,
    });
    save(new Blob([svg], { type: 'image/svg+xml' }), 'svg');
  };

  // Hand the export actions to the surrounding chrome. Re-registered on every
  // config change (not just readiness) so the SVG closure never goes stale.
  useEffect(() => {
    registerExport?.({ png: downloadPng, svg: downloadSvg, ready });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cfg, registerExport]);

  const strict = cfg.strictVerify;
  const badgeLabel =
    badge === 'ok'
      ? strict ? '✓ Scanner-verified · studio-grade' : '✓ Scanner-verified — this will scan'
      : badge === 'fail'
        ? strict ? '⚠ Fails the strict check — lower detail or raise contrast' : BADGE_TEXT.fail
        : BADGE_TEXT[badge];

  return (
    <>
      <div className="ws-sheet">
        <div className="preview" ref={holder} />
        {badge !== 'hidden' && <div className={`badge badge--${badge}`}>{badgeLabel}</div>}
      </div>
      <p className="hint">{hint}</p>
    </>
  );
}
