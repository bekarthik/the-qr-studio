import { useEffect, useMemo, useState } from 'react';
import jsQR from 'jsqr';
import { useGen } from '../state/GeneratorContext';
import { cardDims } from '../card/card';
import { buildCardArtifacts, save } from '../card/artifacts';

type BadgeState = 'hidden' | 'checking' | 'ok' | 'fail';
const BADGE_TEXT: Record<BadgeState, string> = {
  hidden: '',
  checking: 'Checking scannability…',
  ok: '✓ Card scans',
  fail: '⚠ Card QR may not scan — raise QR size, turn off “exact design”, or simplify the image',
};

/** Rasterise a card-face SVG and decode the embedded QR — the same honest proof
 *  the QR tab gives, so the card flow can't ship an unscannable code silently. */
function verifyFace(svg: string, payload: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = 1100;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = Math.max(1, Math.round((img.height / img.width) * W));
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(false);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let ok = false;
      try {
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const res = jsQR(d.data, canvas.width, canvas.height);
        ok = Boolean(res) && res!.data === payload;
      } catch {
        ok = false;
      }
      URL.revokeObjectURL(img.src);
      resolve(ok);
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  });
}

/** The visiting-card live preview + scannability badge + downloads. */
export function CardPreview() {
  const { cfg } = useGen();
  const { hasData, twoSided, baseName, payload, out } = useMemo(() => buildCardArtifacts(cfg), [cfg]);
  const svg = out?.preview ?? '';
  const [badge, setBadge] = useState<BadgeState>('hidden');

  // Verify the face that carries the QR (back when two-sided, else the single face).
  useEffect(() => {
    if (!out || !payload) {
      setBadge('hidden');
      return;
    }
    setBadge('checking');
    let alive = true;
    const face = twoSided ? out.back : out.single;
    const id = window.setTimeout(() => {
      verifyFace(face, payload).then((ok) => {
        if (alive) setBadge(ok ? 'ok' : 'fail');
      });
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [out, payload, twoSided]);

  const savePng = (source: string, filename: string) => {
    const { w, h } = cardDims(cfg.cardOrientation, false);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && save(b, filename), 'image/png');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  };

  const downloadSvg = () => {
    if (!out) return;
    if (twoSided) {
      save(new Blob([out.front], { type: 'image/svg+xml' }), `${baseName}-front.svg`);
      save(new Blob([out.back], { type: 'image/svg+xml' }), `${baseName}-back.svg`);
    } else {
      save(new Blob([out.single], { type: 'image/svg+xml' }), `${baseName}.svg`);
    }
  };
  const downloadPng = () => {
    if (!out) return;
    if (twoSided) {
      savePng(out.front, `${baseName}-front.png`);
      savePng(out.back, `${baseName}-back.png`);
    } else {
      savePng(out.single, `${baseName}.png`);
    }
  };

  if (!hasData || !svg) {
    return <p className="empty">Fill in the source details to generate a card.</p>;
  }

  return (
    <>
      <img className="cardx__preview" src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Visiting card preview" />
      {badge !== 'hidden' && <div className={`badge badge--${badge}`}>{BADGE_TEXT[badge]}</div>}
      <div className="downloads">
        <button className="download" onClick={downloadPng}>Download PNG{twoSided && ' ×2'}</button>
        <button className="download download--alt" onClick={downloadSvg}>Download SVG{twoSided && ' ×2'}</button>
      </div>
      <p className="finehint">
        The QR encodes your current source, styled to always scan. Tick <b>Match QR’s exact design</b>
        {' '}in the card controls to mirror the live code (halftone / logo / watermark).
        {twoSided && <> Two-sided downloads as <b>two files</b> — <code>-front</code> and <code>-back</code>.</>}
      </p>
    </>
  );
}
