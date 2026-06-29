import { useEffect, useRef, useState } from 'react';
import { useGen, type Config } from '../state/GeneratorContext';
import { str, captionFor } from '../card/artifacts';
import {
  CARD_FONTS,
  type CardBgStyle, type CardPattern, type CardText, type CardOrientation,
  type CardDivider, type CardGraphic, type CardTextV, type CardTextH,
} from '../card/card';

/** Card-design fields captured by a saved preset / design file (design only —
 *  never the contact data, caption text, or which fields are shown). */
const CAPTURE = [
  'cardBgStyle', 'cardBg1', 'cardBg2', 'cardGradAngle', 'cardPattern', 'cardAccentAuto', 'cardAccent',
  'cardText', 'cardAccentBar', 'cardBorder', 'cardPanel', 'cardOrientation', 'cardHeadingFont', 'cardBodyFont',
  'cardDivider', 'cardGraphic', 'cardTextV', 'cardTextH',
  'cardLogoShow', 'cardLogoV', 'cardLogoH', 'cardLogoSize',
  'cardQrScale', 'cardWatermarkShow', 'cardWatermarkOpacity', 'cardShowCaption',
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

/** The visiting-card design controls (ribbon). Lives in the controls column. */
export function CardControls() {
  const { cfg, update } = useGen();
  const [tab, setTab] = useState<CardTab>('content');
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || (isVcard ? vcardName : '');

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
  const deletePreset = (name: string) => {
    if (!window.confirm(`Delete the saved preset “${name}”? This can’t be undone.`)) return;
    persist(custom.filter((p) => p.name !== name));
  };

  // Download / load the design (theme only — no contact data).
  const fileRef = useRef<HTMLInputElement>(null);
  const exportDesign = () => {
    const design: Record<string, unknown> = {};
    for (const k of CAPTURE) design[k] = cfg[k];
    const doc = { app: 'qr-studio', kind: 'card-design', version: 1, design };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    a.download = 'qr-card-design.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importDesign = async (file: File) => {
    try {
      const obj = JSON.parse(await file.text());
      const src = (obj && typeof obj === 'object' && obj.design && typeof obj.design === 'object' ? obj.design : obj) as Record<string, unknown>;
      const allowed = new Set<string>(CAPTURE);
      const patch: Partial<Config> = {};
      for (const [k, val] of Object.entries(src)) {
        if (allowed.has(k) && val !== undefined) (patch as Record<string, unknown>)[k] = val;
      }
      if (Object.keys(patch).length === 0) {
        window.alert('No card-design properties found in that file.');
        return;
      }
      update(patch);
    } catch {
      window.alert('Could not read that file — expected a QR Studio card-design JSON.');
    }
  };

  const twoSided = cfg.cardTwoSided;
  const showBg2 = cfg.cardBgStyle === 'gradient' || cfg.cardBgStyle === 'pattern';
  const fontOpts = CARD_FONTS.map((f) => (
    <option key={f.label} value={f.stack}>{f.label}</option>
  ));

  return (
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
            <button type="button" className="preset preset--io" title="Download this design as a JSON file (no data)" onClick={exportDesign}>⤓ Export</button>
            <button type="button" className="preset preset--io" title="Load a design from a JSON file" onClick={() => fileRef.current?.click()}>⤒ Import</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void importDesign(f);
              }}
            />
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
  );
}
