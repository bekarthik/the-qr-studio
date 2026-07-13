import { useState } from 'react';
import { useGen } from '../state/GeneratorContext';
import type { ColorStyle, ModuleShape, EyeShape } from '../qr/grid';
import type { ErrorLevel } from '../qr/matrix';
import { Seg, Toggle, WsTabs } from './StudioControls';

const MIN_DOT: Record<number, number> = { 3: 0, 5: 0.07, 7: 0.1 };
const INKS = ['#16130E', '#FF4A1C', '#0F7A55', '#2340FF'];

type Tab = 'colour' | 'shape' | 'image';
const TABS: { id: Tab; label: string }[] = [
  { id: 'colour', label: 'Colour' },
  { id: 'shape', label: 'Shape' },
  { id: 'image', label: 'Image' },
];

/**
 * Right pane for a QR — colour / shape / image controls, grouped into tabs so
 * each view stays short. Every control writes the real generator config;
 * conditional advanced controls surface only when their feature is on.
 */
export function StudioStyle() {
  const { cfg, update } = useGen();
  const [tab, setTab] = useState<Tab>('colour');
  const imageOn = cfg.resemble || cfg.embed;
  const styleValue = cfg.resemble ? 'halftone' : cfg.colorStyle;

  const setStyle = (v: string) => {
    if (v === 'halftone') update({ resemble: true });
    else update({ colorStyle: v as ColorStyle, resemble: false });
  };
  const setDetail = (detail: number) => update({ detail, dotSize: MIN_DOT[detail] ?? 0 });

  const colour = (
    <>
      <div className="ws-field">
        <label>Style</label>
        <Seg
          value={styleValue}
          onChange={setStyle}
          options={[
            { k: 'solid', l: 'Solid' },
            { k: 'brand', l: 'Brand' },
            { k: 'image', l: 'Image' },
            { k: 'halftone', l: 'Halftone' },
          ]}
        />
      </div>
      <div className="ws-field">
        <label>Ink</label>
        <div className="ws-inks">
          {INKS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Ink ${c}`}
              className={'ws-sw' + (cfg.fg.toLowerCase() === c.toLowerCase() ? ' on' : '')}
              style={{ background: c }}
              onClick={() => update({ fg: c })}
            />
          ))}
          <label className="ws-sw add" title="Custom colour">
            +
            <input type="color" value={cfg.fg} onChange={(e) => update({ fg: e.target.value })} />
          </label>
        </div>
      </div>
      <div className="ws-field">
        <label>Background</label>
        <input className="ws-color" type="color" value={cfg.bg} onChange={(e) => update({ bg: e.target.value })} />
      </div>
      {cfg.colorStyle === 'brand' && !cfg.resemble && (
        <>
          <div className="ws-field">
            <label>Brand colour</label>
            <input className="ws-color" type="color" value={cfg.brandColor} disabled={cfg.autoBrand} onChange={(e) => update({ brandColor: e.target.value })} />
          </div>
          <Toggle on={cfg.autoBrand} label="Auto-detect from image" onToggle={() => update({ autoBrand: !cfg.autoBrand })} />
        </>
      )}
    </>
  );

  const shape = (
    <>
      <div className="ws-field">
        <label>Module shape</label>
        <Seg
          value={cfg.shape}
          onChange={(k) => update({ shape: k as ModuleShape })}
          options={[
            { k: 'square', l: 'Square' },
            { k: 'rounded', l: 'Rounded' },
            { k: 'dot', l: 'Dots' },
            { k: 'liquid', l: 'Liquid' },
          ]}
        />
      </div>
      <div className="ws-field">
        <label>Finder eyes</label>
        <Seg
          value={cfg.eyeShape}
          onChange={(k) => update({ eyeShape: k as EyeShape })}
          options={[
            { k: 'auto', l: 'Auto' },
            { k: 'square', l: 'Square' },
            { k: 'rounded', l: 'Rounded' },
            { k: 'circle', l: 'Circle' },
          ]}
        />
      </div>
      <div className="ws-field">
        <label>Eye colour</label>
        <input className="ws-color" type="color" value={cfg.eyeColor} disabled={cfg.autoEyeColor} onChange={(e) => update({ eyeColor: e.target.value })} />
      </div>
      <Toggle on={cfg.autoEyeColor} label="Match foreground" onToggle={() => update({ autoEyeColor: !cfg.autoEyeColor })} />
      <div className="ws-field">
        <label>Error correction{imageOn ? ' (forced H)' : ''}</label>
        <Seg
          value={imageOn ? 'H' : cfg.errorLevel}
          disabled={imageOn}
          onChange={(k) => update({ errorLevel: k as ErrorLevel })}
          options={[
            { k: 'L', l: 'L' },
            { k: 'M', l: 'M' },
            { k: 'Q', l: 'Q' },
            { k: 'H', l: 'H' },
          ]}
        />
      </div>
    </>
  );

  const image = (
    <>
      <div className="ws-field">
        <label>Add an image feature</label>
        <div className="ws-imgrow">
          <button type="button" className={'ws-imgbtn' + (cfg.resemble ? ' on' : '')} aria-pressed={cfg.resemble} onClick={() => update({ resemble: !cfg.resemble })}>+ Halftone</button>
          <button type="button" className={'ws-imgbtn' + (cfg.embed ? ' on' : '')} aria-pressed={cfg.embed} onClick={() => update({ embed: !cfg.embed })}>+ Logo</button>
          <button type="button" className={'ws-imgbtn' + (cfg.watermark ? ' on' : '')} aria-pressed={cfg.watermark} onClick={() => update({ watermark: !cfg.watermark })}>+ Mark</button>
        </div>
      </div>

      {!imageOn && !cfg.watermark && (
        <p className="ws-note">Turn on a feature, then upload an image in the Source pane.</p>
      )}

      {cfg.resemble && (
        <>
          <div className="ws-field">
            <label>Halftone detail</label>
            <Seg value={cfg.detail} onChange={(k) => setDetail(Number(k))} options={[{ k: 3, l: 'Standard' }, { k: 5, l: 'High' }, { k: 7, l: 'Finest' }]} />
          </div>
          <div className="ws-field">
            <label>Data dot size</label>
            <input type="range" min={0} max={100} value={Math.round(cfg.dotSize * 100)} onChange={(e) => update({ dotSize: Number(e.target.value) / 100 })} />
          </div>
          <Toggle on={cfg.autoThreshold} label="Auto contrast" onToggle={() => update({ autoThreshold: !cfg.autoThreshold })} />
          {!cfg.autoThreshold && (
            <div className="ws-field">
              <label>Image detail (threshold)</label>
              <input type="range" min={20} max={80} value={Math.round(cfg.threshold * 100)} onChange={(e) => update({ threshold: Number(e.target.value) / 100 })} />
            </div>
          )}
          <Toggle on={cfg.invert} label="Invert image" onToggle={() => update({ invert: !cfg.invert })} />
        </>
      )}

      {cfg.embed && (
        <>
          <div className="ws-field">
            <label>Logo position</label>
            <Seg value={cfg.embedPos} onChange={(k) => update({ embedPos: k as 'center' | 'br' })} options={[{ k: 'center', l: 'Centre' }, { k: 'br', l: 'Corner' }]} />
          </div>
          <div className="ws-field">
            <label>Logo size</label>
            <input type="range" min={10} max={32} value={Math.round(cfg.logoRatio * 100)} onChange={(e) => update({ logoRatio: Number(e.target.value) / 100 })} />
          </div>
          <Toggle on={cfg.plate} label="Plate behind logo" onToggle={() => update({ plate: !cfg.plate })} />
        </>
      )}

      {cfg.watermark && (
        <>
          <div className="ws-field">
            <label>Watermark placement</label>
            <Seg value={cfg.watermarkPos} onChange={(k) => update({ watermarkPos: k as 'across' | 'br' })} options={[{ k: 'across', l: 'Across' }, { k: 'br', l: 'Corner' }]} />
          </div>
          <div className="ws-field">
            <label>Watermark opacity</label>
            <input type="range" min={4} max={45} value={Math.round(cfg.watermarkOpacity * 100)} onChange={(e) => update({ watermarkOpacity: Number(e.target.value) / 100 })} />
          </div>
        </>
      )}

      <Toggle on={cfg.strictVerify} label="Studio-grade strict check" onToggle={() => update({ strictVerify: !cfg.strictVerify })} />
    </>
  );

  return (
    <div className="ws-sec">
      <WsTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'colour' ? colour : tab === 'shape' ? shape : image}
    </div>
  );
}
