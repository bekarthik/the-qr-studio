import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useGen, roleImage, primaryImage, type Config } from '../state/GeneratorContext';
import { buildPayload } from '../content/payloads';
import { buildMatrix, type QrMatrix } from '../qr/matrix';
import { sampleImage, extractBrandColor, type ImageSampler } from '../qr/halftone';
import { renderQR } from '../qr/render';
import { renderSVG } from '../qr/svg';

const RES = 1600;
type BadgeState = 'hidden' | 'checking' | 'ok' | 'fail';

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

export function Preview() {
  const { cfg } = useGen();
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<Snapshot | null>(null);
  const [badge, setBadge] = useState<BadgeState>('hidden');
  const [hint, setHint] = useState('');
  const [ready, setReady] = useState(false);

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
      let ok = false;
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height } = canvas;
          const data = ctx.getImageData(0, 0, width, height).data;
          const res = jsQR(data, width, height);
          ok = Boolean(res) && res!.data === payload;
        }
      } catch {
        ok = false;
      }
      setBadge(ok ? 'ok' : 'fail');
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

  return (
    <>
      <div className="preview" ref={holder} />
      {badge !== 'hidden' && <div className={`badge badge--${badge}`}>{BADGE_TEXT[badge]}</div>}
      <p className="hint">{hint}</p>
      <div className="downloads">
        <button className="download" disabled={!ready} onClick={downloadPng}>
          Download PNG
        </button>
        <button className="download download--alt" disabled={!ready} onClick={downloadSvg}>
          Download SVG
        </button>
      </div>
      <p className="finehint">
        PNG is 1600&nbsp;px — crisp for print up to ~13&nbsp;cm at 300&nbsp;dpi. Use SVG for larger or
        vector print. Always test-scan with a real phone before mass printing.
      </p>
    </>
  );
}
