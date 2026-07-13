import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGen, type Config } from '../state/GeneratorContext';
import { str, captionFor } from '../card/artifacts';
import {
  CARD_FONTS,
  type CardBgStyle, type CardPattern, type CardText, type CardOrientation,
  type CardDivider, type CardGraphic,
} from '../card/card';
import { Seg, Toggle, PosGrid, WsTabs, WsGroup } from './StudioControls';

/** Design-only fields captured by a saved preset / design file. */
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

/** A ws section — a header + body. In stacked layout every section renders;
 *  in tabs layout only the active one does (its header is the tab row). */
function Field({ label, opt, children }: { label: string; opt?: boolean; children: ReactNode }) {
  return (
    <div className="ws-field">
      <label>
        {label}
        {opt && <span className="ws-opt">optional</span>}
      </label>
      {children}
    </div>
  );
}

const CARD_TABS = [
  { id: 'content' as const, label: 'Content' },
  { id: 'design' as const, label: 'Design' },
  { id: 'logo' as const, label: 'Logo & QR' },
];

/**
 * Visiting-card controls in the workstation's ws design language, grouped into
 * tabs (Content / Design / Logo & QR) with labelled sub-groups inside Design so
 * the many options stay digestible. Every control writes the same Config keys
 * as the classic panel, so nothing is lost.
 */
export function StudioCard() {
  const { cfg, update } = useGen();
  const [tab, setTab] = useState<'content' | 'design' | 'logo'>('content');
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || (isVcard ? vcardName : '');

  const cardFields = (
    [
      { key: 'cardShowName', label: 'Name', val: displayName },
      { key: 'cardShowTitle', label: 'Title', val: str(v.title) },
      { key: 'cardShowOrg', label: 'Company', val: str(v.org) },
      { key: 'cardShowPhone', label: 'Phone', val: str(v.phone) },
      { key: 'cardShowEmail', label: 'Email', val: str(v.email) },
      { key: 'cardShowUrl', label: 'Website', val: str(v.url) },
      { key: 'cardShowAddress', label: 'Address', val: str(v.address) },
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
    if (!window.confirm(`Delete the saved preset “${name}”?`)) return;
    persist(custom.filter((p) => p.name !== name));
  };

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
      if (Object.keys(patch).length === 0) return window.alert('No card-design properties found in that file.');
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

  const content = (
    <>
      <Field label="Name on card" opt>
        <input className="ws-inp" type="text" placeholder={vcardName || 'e.g. Asha Rao'} value={cfg.cardName} onChange={(e) => update({ cardName: e.target.value })} />
      </Field>
      <Field label="Caption" opt>
        <input className="ws-inp" type="text" placeholder={captionFor(cfg.type)} value={cfg.cardCaption} disabled={!cfg.cardShowCaption} onChange={(e) => update({ cardCaption: e.target.value })} />
      </Field>
      <Toggle on={cfg.cardShowCaption} label="Show caption" onToggle={() => update({ cardShowCaption: !cfg.cardShowCaption })} />
      {isVcard && cardFields.length > 0 && (
        <Field label="Show on card">
          <div className="ws-chips">
            {cardFields.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={cfg[f.key]}
                className={'ws-chip' + (cfg[f.key] ? ' on' : '')}
                onClick={() => update({ [f.key]: !cfg[f.key] } as Partial<Config>)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Field>
      )}
    </>
  );

  const design = (
    <>
      <div className="ws-presets">
        {BUILTIN.map((p) => (
          <button key={p.name} type="button" className="ws-preset" onClick={() => update(p.patch)}>{p.name}</button>
        ))}
        {custom.map((p) => (
          <span key={p.name} className="ws-preset ws-preset--custom">
            <button type="button" onClick={() => update(p.patch)}>{p.name}</button>
            <button type="button" className="ws-preset__del" title="Delete preset" onClick={() => deletePreset(p.name)}>×</button>
          </span>
        ))}
        <button type="button" className="ws-preset ws-preset--ghost" onClick={savePreset}>＋ Save</button>
        <button type="button" className="ws-preset ws-preset--ghost" onClick={exportDesign}>⤓ Export</button>
        <button type="button" className="ws-preset ws-preset--ghost" onClick={() => fileRef.current?.click()}>⤒ Import</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importDesign(f); }} />
      </div>

      <WsGroup label="Layout">
        <Field label="Orientation">
          <Seg value={cfg.cardOrientation} onChange={(k) => update({ cardOrientation: k as CardOrientation })} options={[{ k: 'landscape', l: 'Landscape' }, { k: 'portrait', l: 'Portrait' }]} />
        </Field>
        <Field label="Background">
          <Seg value={cfg.cardBgStyle} onChange={(k) => update({ cardBgStyle: k as CardBgStyle })} options={[{ k: 'solid', l: 'Solid' }, { k: 'gradient', l: 'Gradient' }, { k: 'pattern', l: 'Pattern' }]} />
        </Field>
        <Field label={`Text position${isVcard ? ' (top row)' : ''}`}>
          <PosGrid v={isVcard ? 'top' : cfg.cardTextV} h={cfg.cardTextH} lockTop={isVcard} onPick={(vv, hh) => update({ cardTextV: vv, cardTextH: hh })} />
        </Field>
        <Field label="Heading font">
          <select className="ws-inp" value={cfg.cardHeadingFont} onChange={(e) => update({ cardHeadingFont: e.target.value })}>{fontOpts}</select>
        </Field>
        <Field label="Body font">
          <select className="ws-inp" value={cfg.cardBodyFont} onChange={(e) => update({ cardBodyFont: e.target.value })}>{fontOpts}</select>
        </Field>
      </WsGroup>

      <WsGroup label="Colour">
        <Field label={showBg2 ? 'Colour 1' : 'Background colour'}>
          <input className="ws-color" type="color" value={cfg.cardBg1} onChange={(e) => update({ cardBg1: e.target.value })} />
        </Field>
        {showBg2 && (
          <Field label={cfg.cardBgStyle === 'gradient' ? 'Colour 2' : 'Pattern colour'}>
            <input className="ws-color" type="color" value={cfg.cardBg2} onChange={(e) => update({ cardBg2: e.target.value })} />
          </Field>
        )}
        <Field label="Text">
          <Seg value={cfg.cardText} onChange={(k) => update({ cardText: k as CardText })} options={[{ k: 'auto', l: 'Auto' }, { k: 'dark', l: 'Dark' }, { k: 'light', l: 'Light' }]} />
        </Field>
        {cfg.cardBgStyle === 'gradient' && (
          <Field label="Gradient angle">
            <input type="range" min={0} max={360} value={cfg.cardGradAngle} onChange={(e) => update({ cardGradAngle: Number(e.target.value) })} />
          </Field>
        )}
        {cfg.cardBgStyle === 'pattern' && (
          <Field label="Pattern">
            <select className="ws-inp" value={cfg.cardPattern} onChange={(e) => update({ cardPattern: e.target.value as CardPattern })}>
              <option value="dots">Dots</option>
              <option value="grid">Grid</option>
              <option value="diagonal">Diagonal</option>
              <option value="crosshatch">Crosshatch</option>
            </select>
          </Field>
        )}
        <Field label="Accent colour">
          <input className="ws-color" type="color" value={cfg.cardAccent} disabled={cfg.cardAccentAuto} onChange={(e) => update({ cardAccent: e.target.value })} />
        </Field>
        <Toggle on={cfg.cardAccentAuto} label="Match QR accent" onToggle={() => update({ cardAccentAuto: !cfg.cardAccentAuto })} />
      </WsGroup>

      <WsGroup label="Finish">
        <Field label="Divider (under name)">
          <select className="ws-inp" value={cfg.cardDivider} onChange={(e) => update({ cardDivider: e.target.value as CardDivider })}>
            <option value="line">Line</option>
            <option value="short">Short</option>
            <option value="thick">Thick</option>
            <option value="double">Double</option>
            <option value="dotted">Dotted</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Graphic">
          <select className="ws-inp" value={cfg.cardGraphic} onChange={(e) => update({ cardGraphic: e.target.value as CardGraphic })}>
            <option value="none">None</option>
            <option value="arc">Arcs</option>
            <option value="ring">Ring</option>
            <option value="dots">Dots</option>
            <option value="wave">Wave footer</option>
            <option value="corner">Corner</option>
          </select>
        </Field>
        <Toggle on={cfg.cardAccentBar} label="Accent bar (left edge)" onToggle={() => update({ cardAccentBar: !cfg.cardAccentBar })} />
        <Toggle on={cfg.cardBorder} label="Border" onToggle={() => update({ cardBorder: !cfg.cardBorder })} />
        <Toggle on={cfg.cardPanel} label="Panel behind QR" onToggle={() => update({ cardPanel: !cfg.cardPanel })} />
      </WsGroup>
    </>
  );

  const logo = (
    <>
      <Toggle on={cfg.cardLogoShow} label={`Show logo${twoSided ? ' (front)' : ''}`} onToggle={() => update({ cardLogoShow: !cfg.cardLogoShow })} />
      <Field label="Logo size">
        <input type="range" min={20} max={62} disabled={!cfg.cardLogoShow} value={Math.round(cfg.cardLogoSize * 100)} onChange={(e) => update({ cardLogoSize: Number(e.target.value) / 100 })} />
      </Field>
      <Field label="Logo position">
        <PosGrid v={cfg.cardLogoV} h={cfg.cardLogoH} disabled={!cfg.cardLogoShow} onPick={(vv, hh) => update({ cardLogoV: vv, cardLogoH: hh })} />
      </Field>
      <Toggle on={cfg.cardWatermarkShow} label="Faint watermark" onToggle={() => update({ cardWatermarkShow: !cfg.cardWatermarkShow })} />
      <Field label="Watermark opacity">
        <input type="range" min={3} max={40} disabled={!cfg.cardWatermarkShow} value={Math.round(cfg.cardWatermarkOpacity * 100)} onChange={(e) => update({ cardWatermarkOpacity: Number(e.target.value) / 100 })} />
      </Field>
      <Field label="QR size">
        <input type="range" min={60} max={120} value={Math.round(cfg.cardQrScale * 100)} onChange={(e) => update({ cardQrScale: Number(e.target.value) / 100 })} />
      </Field>
      <Toggle on={cfg.cardExactQr} label="Match QR’s exact design" onToggle={() => update({ cardExactQr: !cfg.cardExactQr })} />
    </>
  );

  const active = tab === 'content' ? content : tab === 'design' ? design : logo;
  return (
    <div className="ws-sec">
      <WsTabs tabs={CARD_TABS} active={tab} onChange={setTab} />
      {active}
    </div>
  );
}
