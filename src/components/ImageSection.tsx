import type { ChangeEvent, ReactNode } from 'react';
import { useGen, type ImageRole } from '../state/GeneratorContext';

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Image upload (multiple) + the three image-feature toggles, each with its
 *  own image picker so one upload can drive all roles or several can split. */
export function ImageSection() {
  const { cfg, update } = useGen();
  const { images } = cfg;

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const loaded = await Promise.all(files.map((f) => readImage(f).catch(() => null)));
    update({ images: [...images, ...loaded.filter((x): x is HTMLImageElement => x != null)] });
  };

  const removeAt = (i: number) => {
    const next = images.filter((_, k) => k !== i);
    const fix = (idx: number) => (idx === i ? 0 : idx > i ? idx - 1 : idx);
    update({
      images: next,
      halftoneIdx: fix(cfg.halftoneIdx),
      logoIdx: fix(cfg.logoIdx),
      watermarkIdx: fix(cfg.watermarkIdx),
    });
  };

  // Which active roles currently point at image `i` (for the thumbnail badges).
  const rolesAt = (i: number): string[] => {
    const out: string[] = [];
    if (cfg.resemble && cfg.halftoneIdx === i) out.push('H');
    if (cfg.embed && cfg.logoIdx === i) out.push('L');
    if (cfg.watermark && cfg.watermarkIdx === i) out.push('W');
    return out;
  };

  /** A feature toggle plus (when >1 image) a picker for which image it uses. */
  function Feature(props: {
    role: ImageRole;
    on: boolean;
    onToggle: (v: boolean) => void;
    idx: number;
    onPick: (i: number) => void;
    label: ReactNode;
  }) {
    return (
      <div className="img-feature">
        <label className="field field--check">
          <input type="checkbox" checked={props.on} onChange={(e) => props.onToggle(e.target.checked)} />
          <span className="field__label">{props.label}</span>
        </label>
        {props.on && images.length > 1 && (
          <label className="field img-pick">
            <span className="field__label">uses</span>
            <select value={Math.min(props.idx, images.length - 1)} onChange={(e) => props.onPick(Number(e.target.value))}>
              {images.map((_, i) => (
                <option key={i} value={i}>
                  Image {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="image-block">
      <label className="upload">
        <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
        <span className="upload__btn">{images.length ? 'Add image(s)' : 'Upload image(s) / logo'}</span>
      </label>

      {images.length > 0 && (
        <div className="img-gallery">
          {images.map((img, i) => {
            const roles = rolesAt(i);
            return (
              <div className="img-tile" key={i}>
                <img className="img-tile__thumb" src={img.src} alt={`Image ${i + 1}`} />
                <span className="img-tile__num">{i + 1}</span>
                {roles.length > 0 && <span className="img-tile__roles">{roles.join(' ')}</span>}
                <button type="button" className="img-tile__rm" title="Remove image" onClick={() => removeAt(i)}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      {images.length > 1 && (
        <p className="img-hint">Multiple images — pick which one each effect below uses (badges: H halftone · L logo · W watermark).</p>
      )}

      <Feature
        role="halftone"
        on={cfg.resemble}
        onToggle={(v) => update({ resemble: v })}
        idx={cfg.halftoneIdx}
        onPick={(i) => update({ halftoneIdx: i })}
        label={
          <>
            Make the QR <b>resemble</b> the image (halftone)
          </>
        }
      />
      <Feature
        role="logo"
        on={cfg.embed}
        onToggle={(v) => update({ embed: v })}
        idx={cfg.logoIdx}
        onPick={(i) => update({ logoIdx: i })}
        label={
          <>
            <b>Embed</b> the image (crisp logo — centre or corner)
          </>
        }
      />
      <Feature
        role="watermark"
        on={cfg.watermark}
        onToggle={(v) => update({ watermark: v })}
        idx={cfg.watermarkIdx}
        onPick={(i) => update({ watermarkIdx: i })}
        label={
          <>
            Add the image as a faint <b>watermark</b>
          </>
        }
      />
    </div>
  );
}
