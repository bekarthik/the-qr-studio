import { useEffect, useMemo, useState } from 'react';
import { useGen, roleImage, primaryImage, type Config } from '../state/GeneratorContext';
import { buildPayload, type SourceType } from '../content/payloads';
import { buildMatrix } from '../qr/matrix';
import { renderSVG } from '../qr/svg';
import { brandDarkHex } from '../qr/grid';
import { sampleImage, extractBrandColor } from '../qr/halftone';
import {
  buildCardSVG, buildCardSheetSVG, buildCardFrontSVG, buildCardBackSVG, cardDims, CARD_FONTS,
  type CardData, type CardTheme, type CardBgStyle, type CardPattern, type CardText, type CardOrientation,
  type CardDivider, type CardGraphic, type CardTextV, type CardTextH,
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
  'cardDivider', 'cardGraphic', 'cardTextV', 'cardTextH',
  'cardLogoShow', 'cardLogoV', 'cardLogoH', 'cardLogoSize',
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

type CardTab = 'content' | 'design' | 'logo';
const CARD_TABS: { id: CardTab; icon: string; label: string }[] = [
  { id: 'content', icon: '👤', label: 'Content' },
  { id: 'design', icon: '🎨', label: 'Design' },
  { id: 'logo', icon: '🖼️', label: 'Logo & QR' },
];

const V3: CardTextV[] = ['top', 'middle', 'bottom'];
const H3: CardTextH[] = ['left', 'center', 'right'];

/** A compact 3×3 position picker (replaces two vertical/horizontal dropdowns). */
function PosGrid(props: {
  v: CardTextV;
  h: CardTextH;
  onPick: (v: CardTextV, h: CardTextH) => void;
  lockTop?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="posgrid" role="group" aria-label="Position">
      {V3.map((vv) =>
        H3.map((hh) => {
          const sel = props.v === vv && props.h === hh;
          const dis = props.disabled || (props.lockTop && vv !== 'top');
          return (
            <button
              key={vv + hh}
              type="button"
              disabled={dis}
              aria-pressed={sel}
              title={`${vv} ${hh}`}
              className={'posgrid__c' + (sel ? ' is-sel' : '')}
              onClick={() => props.onPick(vv, hh)}
            />
          );
        }),
      )}
    </div>
  );
}

/** Orientation as two icon buttons instead of a dropdown. */
function Orient({ value, onPick }: { value: CardOrientation; onPick: (o: CardOrientation) => void }) {
  return (
    <div className="seg" role="group" aria-label="Orientation">
      <button type="button" title="Landscape" aria-pressed={value === 'landscape'} className={'seg__b' + (value === 'landscape' ? ' is-on' : '')} onClick={() => onPick('landscape')}>
        <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="3" width="20" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <button type="button" title="Portrait" aria-pressed={value === 'portrait'} className={'seg__b' + (value === 'portrait' ? ' is-on' : '')} onClick={() => onPick('portrait')}>
        <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><rect x="3" y="1" width="10" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
    </div>
  );
}

export function CardExport() {
  const { cfg, update } = useGen();
  const [tab, setTab] = useState<CardTab>('content');
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || (isVcard ? vcardName : '');

  const payload = buildPayload(cfg.type, cfg.values[cfg.type] ?? {});
  const hasData = Boolean(payload);
  const twoSided = cfg.cardTwoSided;

  // Per-field visibility toggles (only those with an actual value are offered).
  const cardFields = (
    [
      { key: 'cardShowName', label: 'Name', icon: '👤', val: displayName },
      { key: 'cardShowTitle', label: 'Title', icon: '🏷️', val: str(v.title) },
      { key: 'cardShowOrg', label: 'Company', icon: '🏢', val: str(v.org) },
      { key: 'cardShowPhone', label: 'Phone', icon: '📞', val: str(v.phone) },
      { key: 'cardShowEmail', label: 'Email', icon: '✉️', val: str(v.email) },
      { key: 'cardShowUrl', label: 'Website', icon: '🌐', val: str(v.url) },
      { key: 'cardShowAddress', label: 'Address', icon: '📍', val: str(v.address) },
    ] as const
  ).filter((f) => f.val.trim());

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
    // Exact mode mirrors the main code's design (image modes); otherwise a clean,
    // always-scannable code with just the colour/shape styling.
    const exact = cfg.cardExactQr;
    const imageOn = exact && (cfg.resemble || cfg.embed);
    const errorLevel = exact ? (imageOn ? 'H' : cfg.errorLevel) : 'H';
    let matrix;
    try {
      matrix = buildMatrix(payload, errorLevel);
    } catch {
      return null;
    }
    const eyeColor = cfg.autoEyeColor ? null : cfg.eyeColor;
    let qrSvg: string;
    if (exact) {
      const detail = cfg.detail;
      const smooth = detail >= 5 ? 1 : 0;
      const brandImg = primaryImage(cfg);
      const halftoneImg = roleImage(cfg, 'halftone');
      const logoImg = roleImage(cfg, 'logo');
      const watermarkImg = roleImage(cfg, 'watermark');
      const brandColor =
        cfg.autoBrand && brandImg && cfg.colorStyle === 'brand'
          ? extractBrandColor(brandImg, brandImg.naturalWidth, brandImg.naturalHeight)
          : cfg.brandColor;
      const sampler =
        cfg.resemble && halftoneImg
          ? sampleImage(halftoneImg, halftoneImg.naturalWidth, halftoneImg.naturalHeight, {
              gridSize: matrix.size * detail, threshold: cfg.threshold, invert: cfg.invert, auto: cfg.autoThreshold, smooth,
            })
          : null;
      qrSvg = renderSVG({
        matrix, quietModules: 2, fg: cfg.fg, bg: cfg.bg, sampler, protectPatterns: cfg.protectPatterns,
        colorStyle: cfg.colorStyle, brandColor, sub: detail, core: 0, dotScale: cfg.dotSize,
        shape: cfg.shape, eyeShape: cfg.eyeShape, eyeColor,
        watermark: cfg.watermark && watermarkImg ? { href: watermarkImg.src, opacity: cfg.watermarkOpacity, position: cfg.watermarkPos } : null,
        centerImage: cfg.embed && logoImg ? { href: logoImg.src, ratio: cfg.logoRatio, plate: cfg.plate, position: cfg.embedPos } : null,
        pixelSize: 420,
      });
    } else {
      qrSvg = renderSVG({
        matrix, quietModules: 2, fg: cfg.fg, bg: cfg.bg, sampler: null, protectPatterns: true,
        colorStyle: cfg.colorStyle, brandColor: cfg.brandColor, sub: 3, core: 0,
        shape: cfg.shape, eyeShape: cfg.eyeShape, eyeColor, pixelSize: 420,
      });
    }
    const theme: CardTheme = {
      bgStyle: cfg.cardBgStyle, bg1: cfg.cardBg1, bg2: cfg.cardBg2, gradAngle: cfg.cardGradAngle, pattern: cfg.cardPattern,
      accent: cfg.cardAccentAuto ? (cfg.colorStyle === 'brand' ? brandDarkHex(cfg.brandColor) : '#e0522e') : cfg.cardAccent,
      text: cfg.cardText, accentBar: cfg.cardAccentBar, border: cfg.cardBorder, qrPanel: cfg.cardPanel,
      orientation: cfg.cardOrientation, headingFont: cfg.cardHeadingFont, bodyFont: cfg.cardBodyFont,
      divider: cfg.cardDivider, graphic: cfg.cardGraphic,
      textV: isVcard ? 'top' : cfg.cardTextV, textH: cfg.cardTextH,
      qrScale: cfg.cardQrScale,
    };
    const data: CardData = {
      name: cfg.cardShowName ? displayName : '',
      title: isVcard && cfg.cardShowTitle ? str(v.title) : '',
      org: isVcard && cfg.cardShowOrg ? str(v.org) : '',
      phone: isVcard && cfg.cardShowPhone ? str(v.phone) : '',
      email: isVcard && cfg.cardShowEmail ? str(v.email) : '',
      url: isVcard && cfg.cardShowUrl ? str(v.url) : '',
      address: isVcard && cfg.cardShowAddress ? str(v.address) : '',
      qrBg: cfg.bg,
      caption: cfg.cardShowCaption ? str(cfg.cardCaption).trim() || captionFor(cfg.type) : '',
    };
    const frontOpts = {
      logoHref: roleImage(cfg, 'logo')?.src ?? null,
      watermarkHref: cfg.cardWatermarkShow ? roleImage(cfg, 'watermark')?.src ?? null : null,
      watermarkOpacity: cfg.cardWatermarkOpacity,
      showLogo: cfg.cardLogoShow,
      logoV: cfg.cardLogoV,
      logoH: cfg.cardLogoH,
      logoSize: cfg.cardLogoSize,
    };
    return {
      preview: twoSided ? buildCardSheetSVG(data, qrSvg, frontOpts, theme) : buildCardSVG(data, qrSvg, frontOpts, theme),
      single: buildCardSVG(data, qrSvg, frontOpts, theme),
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

      <div className="ribbon">
        <div className="ribbon__tabs" role="tablist" aria-label="Card controls">
          {CARD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={'ribbon__tab' + (tab === t.id ? ' is-active' : '')}
              onClick={() => setTab(t.id)}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {tab === 'content' && (
          <div className="ribbon__panel">
            <div className="grid2">
              <label className="field">
                <span className="field__label">Name on card <span className="h__opt">optional</span></span>
                <input type="text" placeholder={vcardName || 'e.g. Asha Rao'} value={cfg.cardName} onChange={(e) => update({ cardName: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">Caption <span className="h__opt">optional</span></span>
                <input type="text" placeholder={captionFor(cfg.type)} value={cfg.cardCaption} disabled={!cfg.cardShowCaption} onChange={(e) => update({ cardCaption: e.target.value })} />
              </label>
              <label className="field field--check">
                <input type="checkbox" checked={cfg.cardShowCaption} onChange={(e) => update({ cardShowCaption: e.target.checked })} />
                <span className="field__label">Show caption</span>
              </label>
              <label className="field field--check">
                <input type="checkbox" checked={twoSided} onChange={(e) => update({ cardTwoSided: e.target.checked })} />
                <span className="field__label">Two-sided — <b>QR on the back</b>, logo/watermark on the front</span>
              </label>
            </div>
            {isVcard && cardFields.length > 0 && (
              <>
                <p className="subhead">Show on card</p>
                <div className="icon-toggles">
                  {cardFields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={cfg[f.key]}
                      title={`${cfg[f.key] ? 'Hide' : 'Show'} ${f.label.toLowerCase()}`}
                      className={'itog' + (cfg[f.key] ? ' is-on' : '')}
                      onClick={() => update({ [f.key]: !cfg[f.key] } as Partial<Config>)}
                    >
                      <span className="itog__i" aria-hidden="true">{f.icon}</span>
                      <span className="itog__t">{f.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'logo' && (
          <div className="ribbon__panel">
          <p className="subhead">Logo {twoSided ? '(front)' : ''}</p>
          <div className="grid2">
            <label className="field field--check">
              <input type="checkbox" checked={cfg.cardLogoShow} onChange={(e) => update({ cardLogoShow: e.target.checked })} />
              <span className="field__label">Show logo on card</span>
            </label>
            <label className="field">
              <span className="field__label">Logo size</span>
              <input type="range" min={20} max={62} disabled={!cfg.cardLogoShow} value={Math.round(cfg.cardLogoSize * 100)} onChange={(e) => update({ cardLogoSize: Number(e.target.value) / 100 })} />
            </label>
            <label className="field">
              <span className="field__label">Logo position</span>
              <PosGrid
                v={cfg.cardLogoV}
                h={cfg.cardLogoH}
                disabled={!cfg.cardLogoShow}
                onPick={(vv, hh) => update({ cardLogoV: vv, cardLogoH: hh })}
              />
            </label>
          </div>

          <p className="subhead">Watermark &amp; QR</p>
          <div className="grid2">
            <label className="field field--check">
              <input type="checkbox" checked={cfg.cardWatermarkShow} onChange={(e) => update({ cardWatermarkShow: e.target.checked })} />
              <span className="field__label">Show faint watermark</span>
            </label>
            <label className="field">
              <span className="field__label">Watermark opacity</span>
              <input type="range" min={3} max={40} disabled={!cfg.cardWatermarkShow} value={Math.round(cfg.cardWatermarkOpacity * 100)} onChange={(e) => update({ cardWatermarkOpacity: Number(e.target.value) / 100 })} />
            </label>
            <label className="field">
              <span className="field__label">QR size</span>
              <input type="range" min={60} max={120} value={Math.round(cfg.cardQrScale * 100)} onChange={(e) => update({ cardQrScale: Number(e.target.value) / 100 })} />
            </label>
            <label className="field field--check">
              <input type="checkbox" checked={cfg.cardExactQr} onChange={(e) => update({ cardExactQr: e.target.checked })} />
              <span className="field__label">Match QR’s exact design (halftone, logo, watermark)</span>
            </label>
          </div>
          </div>
        )}

        {tab === 'design' && (
          <div className="ribbon__panel">
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
          <Orient value={cfg.cardOrientation} onPick={(o) => update({ cardOrientation: o })} />
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
          <span className="field__label">Text position{isVcard ? ' (top row only)' : ''}</span>
          <PosGrid
            v={isVcard ? 'top' : cfg.cardTextV}
            h={cfg.cardTextH}
            lockTop={isVcard}
            onPick={(vv, hh) => update({ cardTextV: vv, cardTextH: hh })}
          />
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
          </div>
        )}
      </div>

      {hasData && svg ? (
        <>
          <img className="cardx__preview" src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Visiting card preview" />
          <div className="downloads">
            <button className="download" onClick={downloadPng}>Download card PNG{twoSided && ' ×2'}</button>
            <button className="download download--alt" onClick={downloadSvg}>Download card SVG{twoSided && ' ×2'}</button>
          </div>
          <p className="finehint">
            The QR encodes your current source. With no name it’s a clean QR-only card. By default
            the card QR uses just your colour/shape style so it always scans; tick <b>Match QR’s
            exact design</b> to replicate the halftone / logo / watermark (then check the main code’s
            badge for scannability).
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
