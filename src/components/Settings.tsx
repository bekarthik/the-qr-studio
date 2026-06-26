import { useGen } from '../state/GeneratorContext';
import type { ColorStyle, ModuleShape, EyeShape } from '../qr/grid';
import type { ErrorLevel } from '../qr/matrix';

/**
 * Unified style & advanced settings — common to every source. Image-only
 * controls (halftone / centre-logo) appear only when that feature is enabled.
 */
export function Settings() {
  const { cfg, update } = useGen();
  const imageOn = cfg.resemble || cfg.embed;

  return (
    <div className="grid2">
      <label className="field">
        <span className="field__label">Foreground</span>
        <input type="color" value={cfg.fg} onChange={(e) => update({ fg: e.target.value })} />
      </label>
      <label className="field">
        <span className="field__label">Background</span>
        <input type="color" value={cfg.bg} onChange={(e) => update({ bg: e.target.value })} />
      </label>

      <label className="field">
        <span className="field__label">Error correction</span>
        <select
          value={imageOn ? 'H' : cfg.errorLevel}
          disabled={imageOn}
          title={imageOn ? 'Forced to H while an image feature is on' : undefined}
          onChange={(e) => update({ errorLevel: e.target.value as ErrorLevel })}
        >
          <option value="L">L · 7%</option>
          <option value="M">M · 15%</option>
          <option value="Q">Q · 25%</option>
          <option value="H">H · 30%</option>
        </select>
      </label>
      <label className="field">
        <span className="field__label">Colour style</span>
        <select
          value={cfg.colorStyle}
          onChange={(e) => update({ colorStyle: e.target.value as ColorStyle })}
        >
          <option value="solid">Solid (foreground)</option>
          <option value="brand">Brand colour</option>
          <option value="image">Image colours</option>
        </select>
      </label>

      <label className="field">
        <span className="field__label">Module shape</span>
        <select value={cfg.shape} onChange={(e) => update({ shape: e.target.value as ModuleShape })}>
          <option value="square">Square (classic)</option>
          <option value="dot">Dots (circles)</option>
          <option value="rounded">Rounded</option>
          <option value="extra">Extra rounded</option>
          <option value="liquid">Liquid (connected)</option>
        </select>
      </label>

      <label className="field">
        <span className="field__label">Finder eyes</span>
        <select value={cfg.eyeShape} onChange={(e) => update({ eyeShape: e.target.value as EyeShape })}>
          <option value="auto">Auto (match modules)</option>
          <option value="square">Square</option>
          <option value="rounded">Rounded</option>
          <option value="circle">Circle</option>
        </select>
      </label>

      <label className="field">
        <span className="field__label">Eye colour</span>
        <input
          type="color"
          value={cfg.eyeColor}
          disabled={cfg.autoEyeColor}
          onChange={(e) => update({ eyeColor: e.target.value })}
        />
      </label>
      <label className="field field--check">
        <input
          type="checkbox"
          checked={cfg.autoEyeColor}
          onChange={(e) => update({ autoEyeColor: e.target.checked })}
        />
        <span className="field__label">Match foreground colour</span>
      </label>

      {cfg.colorStyle === 'brand' && (
        <>
          <label className="field">
            <span className="field__label">Brand colour</span>
            <input
              type="color"
              value={cfg.brandColor}
              disabled={cfg.autoBrand}
              onChange={(e) => update({ brandColor: e.target.value })}
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={cfg.autoBrand}
              onChange={(e) => update({ autoBrand: e.target.checked })}
            />
            <span className="field__label">Auto-detect from image</span>
          </label>
        </>
      )}

      {cfg.resemble && (
        <>
          <p className="subhead">Image (halftone)</p>
          <label className="field">
            <span className="field__label">Halftone detail (image fineness)</span>
            <select value={cfg.detail} onChange={(e) => update({ detail: Number(e.target.value) })}>
              <option value={3}>Standard</option>
              <option value={5}>High</option>
              <option value={7}>Finest</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Data dot size (bigger = scans easier)</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(cfg.dotSize * 100)}
              onChange={(e) => update({ dotSize: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={cfg.autoThreshold}
              onChange={(e) => update({ autoThreshold: e.target.checked })}
            />
            <span className="field__label">Auto contrast (threshold)</span>
          </label>
          <label className="field">
            <span className="field__label">Image detail (threshold)</span>
            <input
              type="range"
              min={20}
              max={80}
              value={Math.round(cfg.threshold * 100)}
              disabled={cfg.autoThreshold}
              onChange={(e) => update({ threshold: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={cfg.invert}
              onChange={(e) => update({ invert: e.target.checked })}
            />
            <span className="field__label">Invert image</span>
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={cfg.protectPatterns}
              onChange={(e) => update({ protectPatterns: e.target.checked })}
            />
            <span className="field__label">Protect alignment &amp; timing patterns</span>
          </label>
        </>
      )}

      {cfg.embed && (
        <>
          <p className="subhead">Embedded logo</p>
          <label className="field">
            <span className="field__label">Position</span>
            <select
              value={cfg.embedPos}
              onChange={(e) => update({ embedPos: e.target.value as 'center' | 'br' })}
            >
              <option value="center">Centre</option>
              <option value="br">Bottom-right corner</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Logo size</span>
            <input
              type="range"
              min={10}
              max={32}
              value={Math.round(cfg.logoRatio * 100)}
              onChange={(e) => update({ logoRatio: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={cfg.plate}
              onChange={(e) => update({ plate: e.target.checked })}
            />
            <span className="field__label">Background plate behind logo</span>
          </label>
        </>
      )}

      {cfg.watermark && (
        <>
          <p className="subhead">Watermark</p>
          <label className="field">
            <span className="field__label">Placement</span>
            <select
              value={cfg.watermarkPos}
              onChange={(e) => update({ watermarkPos: e.target.value as 'across' | 'br' })}
            >
              <option value="across">Across the code</option>
              <option value="br">Bottom-right corner</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Opacity (keep low to stay scannable)</span>
            <input
              type="range"
              min={4}
              max={45}
              value={Math.round(cfg.watermarkOpacity * 100)}
              onChange={(e) => update({ watermarkOpacity: Number(e.target.value) / 100 })}
            />
          </label>
        </>
      )}
    </div>
  );
}
