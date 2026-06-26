import { useEffect, useMemo, useState } from 'react';
import { useGen, type Config } from '../state/GeneratorContext';
import { buildPayload, type SourceType } from '../content/payloads';
import { buildMatrix } from '../qr/matrix';
import { renderSVG } from '../qr/svg';
import { brandDarkHex } from '../qr/grid';
import {
  buildCardSVG, buildCardSheetSVG, buildCardFrontSVG, buildCardBackSVG, cardDims, CARD_FONTS,
  type CardData, type CardTheme, type CardBgStyle, type CardPattern, type CardText, type CardOrientation,
  type CardDivider, type CardGraphic,
} from '../card/card';

const str = (v: unknown) => (v == null ? '' : String(v));

function captionFor(type: SourceType): string {
  switch (type) {
    case 'vcard': return 'SCAN TO SAVE CONTACT';
    case 'url': case 'appstore': case 'playstore': return 'SCAN TO VISIT';
    case 'upi': case 'indbank': case 'paypal': case 'venmo': case 'cashapp': case 'bitcoin': case 'sepa': return 'SCAN TO PAY';
    case 'wifi': return 'SCAN TO CONNECT';
    case 'phone': return 'SCAN TO CALL';
    case 'email': return 'SCAN TO EMAIL';
    default: return 'SCAN ME';
  }
}

/** Card-design fields captured by a saved preset. */
const CAPTURE = [
  'cardBgStyle', 'cardBg1', 'cardBg2', 'cardGradAngle', 'cardPattern', 'cardAccentAuto', 'cardAccent',
  'cardText', 'cardAccentBar', 'cardBorder', 'cardPanel', 'cardOrientation', 'cardHeadingFont', 'cardBodyFont',
  'cardDivider', 'cardGraphic',
] as const;

type Preset = { name: string; patch: Partial<Config> };

const BUILTIN: Preset[] = [
  { name: 'Paper', patch: { cardBgStyle: 'solid', cardBg1: '#fffdf8', cardAccentAuto: true, cardText: 'auto', cardAccentBar: true, cardBorder: true, cardPanel: true } },
  { name: 'Ink', patch: { cardBgStyle: 'solid', cardBg1: '#1c1916', cardText: 'light', cardAccentAuto: false, cardAccent: '#e0522e', cardAccentBar: true } },
  { name: 'Mono', patch: { cardBgStyle: 'solid', cardBg1: '#ffffff', cardText: 'dark', cardAccentAuto: false, cardAccent: '#1c1916', cardAccentBar: true, cardBorder: true } },
  { name: 'Vermilion', patch: { cardBgStyle: 'gradient', cardBg1: '#e0522e', cardBg2: '#b5371f', cardGradAngle: 135, cardText: 'light', cardAccentAuto: false, cardAccent: '#ffd9cf', cardAccentBar: false } },
  { name: 'Ocean', patch: { cardBgStyle: 'gradient', cardBg1: '#16324f', cardBg2: '#2f7d8f', cardGradAngle: 135, cardText: 'light', cardAccentAuto: false, cardAccent: '#7fe3d0', cardAccentBar: false } },
  { name: 'Sunset', patch: { cardBgStyle: 'gradient', cardBg1: '#ff7e5f', cardBg2: '#feb47b', cardGradAngle: 120, cardText: 'dark', cardAccentAuto: false, cardAccent: '#7a2e12', cardAccentBar: false } },
  { name: 'Mint', patch: { cardBgStyle: 'pattern', cardPattern: 'dots', cardBg1: '#eafaf1', cardBg2: '#bfe6cf', cardText: 'dark', cardAccentAuto: false, cardAccent: '#2f7d4f', cardAccentBar: true } },
  { name: 'Blueprint', patch: { cardBgStyle: 'pattern', cardPattern: 'grid', cardBg1: '#0f2436', cardBg2: '#24465f', cardText: 'light', cardAccentAuto: false, cardAccent: '#7fb3ff', cardAccentBar: false } },
];

const LS_KEY = 'qrstudio.cardPresets';

export function CardExport() {
  const { cfg, update } = useGen();
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || (isVcard ? vcardName : '');

  const payload = buildPayload(cfg.type, cfg.values[cfg.type] ?? {});
  const hasData = Boolean(payload);
  const twoSided = cfg.cardTwoSided;

  const [custom, setCustom] = useState<Preset[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  const persist = (next: Preset[]) => {
    setCustom(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const savePreset = () => {
    const name = window.prompt('Save this design as a preset named:')?.trim();
    if (!name) return;
    const patch: Partial<Config> = {};
    for (const k of CAPTURE) (patch as Record<string, unknown>)[k] = cfg[k];
    persist([...custom.filter((p) => p.name !== name), { name, patch }]);
  };
  const deletePreset = (name: string) => persist(custom.filter((p) => p.name !== name));

  const out = useMemo(() => {
    if (!payload) return null;
    let matrix;
    try {
      matrix = buildMatrix(payload, 'H');
    } catch {
      return null;
    }
    const qrSvg = renderSVG({
      matrix, quietModules: 2, fg: cfg.fg, bg: cfg.bg, sampler: null, protectPatterns: true,
      colorStyle: cfg.colorStyle, brandColor: cfg.brandColor, sub: 3, core: 0,
      shape: cfg.shape, eyeShape: cfg.eyeShape, eyeColor: cfg.autoEyeColor ? null : cfg.eyeColor, pixelSize: 420,
    });
    const theme: CardTheme = {
      bgStyle: cfg.cardBgStyle, bg1: cfg.cardBg1, bg2: cfg.cardBg2, gradAngle: cfg.cardGradAngle, pattern: cfg.cardPattern,
      accent: cfg.cardAccentAuto ? (cfg.colorStyle === 'brand' ? brandDarkHex(cfg.brandColor) : '#e0522e') : cfg.cardAccent,
      text: cfg.cardText, accentBar: cfg.cardAccentBar, border: cfg.cardBorder, qrPanel: cfg.cardPanel,
      orientation: cfg.cardOrientation, headingFont: cfg.cardHeadingFont, bodyFont: cfg.cardBodyFont,
      divider: cfg.cardDivider, graphic: cfg.cardGraphic,
    };
    const data: CardData = {
      name: displayName,
      title: isVcard ? str(v.title) : '',
      org: isVcard ? str(v.org) : '',
      phone: isVcard ? str(v.phone) : '',
      email: isVcard ? str(v.email) : '',
      url: isVcard ? str(v.url) : '',
      address: isVcard ? str(v.address) : '',
      qrBg: cfg.bg,
      caption: str(cfg.cardCaption).trim() || captionFor(cfg.type),
    };
    const frontOpts = { logoHref: cfg.image?.src ?? null, watermarkHref: cfg.watermark ? cfg.image?.src ?? null : null, watermarkOpacity: cfg.watermarkOpacity };
    return {
      preview: twoSided ? buildCardSheetSVG(data, qrSvg, frontOpts, theme) : buildCardSVG(data, qrSvg, theme),
      single: buildCardSVG(data, qrSvg, theme),
      front: buildCardFrontSVG(data, frontOpts, theme),
      back: buildCardBackSVG(data, qrSvg, theme),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, payload, twoSided, displayName, isVcard]);

  const svg = out?.preview ?? '';
  const baseName = (displayName || 'card').replace(/\s+/g, '-').toLowerCase() || 'card';

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

  const showBg2 = cfg.cardBgStyle === 'gradient' || cfg.cardBgStyle === 'pattern';
  const fontOpts = CARD_FONTS.map((f) => (
    <option key={f.label} value={f.stack}>{f.label}</option>
  ));

  return (
    <div className="cardx">
      <div className="card__head">
        <h2>Visiting card</h2>
        <p>A print-ready business card (3.5×2″) with your QR — for any source.</p>
      </div>

      <div className="grid2">
        <label className="field">
          <span className="field__label">Name on card <span className="h__opt">optional</span></span>
          <input type="text" placeholder={vcardName || 'e.g. Asha Rao'} value={cfg.cardName} onChange={(e) => update({ cardName: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Caption <span className="h__opt">optional</span></span>
          <input type="text" placeholder={captionFor(cfg.type)} value={cfg.cardCaption} onChange={(e) => update({ cardCaption: e.target.value })} />
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={twoSided} onChange={(e) => update({ cardTwoSided: e.target.checked })} />
          <span className="field__label">Two-sided — <b>QR on the back</b>, logo/watermark on the front</span>
        </label>
      </div>

      <p className="subhead">Design</p>
      <div className="preset-row">
        {BUILTIN.map((p) => (
          <button key={p.name} type="button" className="preset" onClick={() => update(p.patch)}>{p.name}</button>
        ))}
        {custom.map((p) => (
          <span key={p.name} className="preset preset--custom">
            <button type="button" className="preset__apply" onClick={() => update(p.patch)}>{p.name}</button>
            <button type="button" className="preset__del" title="Delete preset" onClick={() => deletePreset(p.name)}>×</button>
          </span>
        ))}
        <button type="button" className="preset preset--save" onClick={savePreset}>＋ Save</button>
      </div>

      <div className="grid2">
        <label className="field">
          <span className="field__label">Orientation</span>
          <select value={cfg.cardOrientation} onChange={(e) => update({ cardOrientation: e.target.value as CardOrientation })}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Background</span>
          <select value={cfg.cardBgStyle} onChange={(e) => update({ cardBgStyle: e.target.value as CardBgStyle })}>
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
            <option value="pattern">Pattern</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Heading font</span>
          <select value={cfg.cardHeadingFont} onChange={(e) => update({ cardHeadingFont: e.target.value })}>{fontOpts}</select>
        </label>
        <label className="field">
          <span className="field__label">Body font</span>
          <select value={cfg.cardBodyFont} onChange={(e) => update({ cardBodyFont: e.target.value })}>{fontOpts}</select>
        </label>

        <label className="field">
          <span className="field__label">{showBg2 ? 'Colour 1' : 'Background colour'}</span>
          <input type="color" value={cfg.cardBg1} onChange={(e) => update({ cardBg1: e.target.value })} />
        </label>
        {showBg2 ? (
          <label className="field">
            <span className="field__label">{cfg.cardBgStyle === 'gradient' ? 'Colour 2' : 'Pattern colour'}</span>
            <input type="color" value={cfg.cardBg2} onChange={(e) => update({ cardBg2: e.target.value })} />
          </label>
        ) : (
          <label className="field">
            <span className="field__label">Text</span>
            <select value={cfg.cardText} onChange={(e) => update({ cardText: e.target.value as CardText })}>
              <option value="auto">Auto contrast</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
        )}

        {cfg.cardBgStyle === 'gradient' && (
          <label className="field">
            <span className="field__label">Gradient angle</span>
            <input type="range" min={0} max={360} value={cfg.cardGradAngle} onChange={(e) => update({ cardGradAngle: Number(e.target.value) })} />
          </label>
        )}
        {cfg.cardBgStyle === 'pattern' && (
          <label className="field">
            <span className="field__label">Pattern</span>
            <select value={cfg.cardPattern} onChange={(e) => update({ cardPattern: e.target.value as CardPattern })}>
              <option value="dots">Dots</option>
              <option value="grid">Grid</option>
              <option value="diagonal">Diagonal</option>
              <option value="crosshatch">Crosshatch</option>
            </select>
          </label>
        )}
        {showBg2 && (
          <label className="field">
            <span className="field__label">Text</span>
            <select value={cfg.cardText} onChange={(e) => update({ cardText: e.target.value as CardText })}>
              <option value="auto">Auto contrast</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
        )}

        <label className="field">
          <span className="field__label">Accent colour</span>
          <input type="color" value={cfg.cardAccent} disabled={cfg.cardAccentAuto} onChange={(e) => update({ cardAccent: e.target.value })} />
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={cfg.cardAccentAuto} onChange={(e) => update({ cardAccentAuto: e.target.checked })} />
          <span className="field__label">Match QR accent</span>
        </label>

        <label className="field">
          <span className="field__label">Divider (under name)</span>
          <select value={cfg.cardDivider} onChange={(e) => update({ cardDivider: e.target.value as CardDivider })}>
            <option value="line">Line</option>
            <option value="short">Short</option>
            <option value="thick">Thick</option>
            <option value="double">Double</option>
            <option value="dotted">Dotted</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Graphic</span>
          <select value={cfg.cardGraphic} onChange={(e) => update({ cardGraphic: e.target.value as CardGraphic })}>
            <option value="none">None</option>
            <option value="arc">Arcs</option>
            <option value="ring">Ring</option>
            <option value="dots">Dots</option>
            <option value="wave">Wave footer</option>
            <option value="corner">Corner</option>
          </select>
        </label>

        <label className="field field--check">
          <input type="checkbox" checked={cfg.cardAccentBar} onChange={(e) => update({ cardAccentBar: e.target.checked })} />
          <span className="field__label">Accent bar (left edge)</span>
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={cfg.cardBorder} onChange={(e) => update({ cardBorder: e.target.checked })} />
          <span className="field__label">Border</span>
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={cfg.cardPanel} onChange={(e) => update({ cardPanel: e.target.checked })} />
          <span className="field__label">Panel behind QR</span>
        </label>
      </div>

      {hasData && svg ? (
        <>
          <img className="cardx__preview" src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Visiting card preview" />
          <div className="downloads">
            <button className="download" onClick={downloadPng}>Download card PNG{twoSided && ' ×2'}</button>
            <button className="download download--alt" onClick={downloadSvg}>Download card SVG{twoSided && ' ×2'}</button>
          </div>
          <p className="finehint">
            The QR encodes your current source. With no name it’s a clean QR-only card. The QR keeps
            its own background so it always scans.
            {twoSided && <> Two-sided downloads as <b>two files</b> — <code>-front</code> and <code>-back</code>; the preview shows them side by side.</>}
          </p>
        </>
      ) : (
        <p className="empty">Fill in the source details (above) to generate a card.</p>
      )}
    </div>
  );
}

function save(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
