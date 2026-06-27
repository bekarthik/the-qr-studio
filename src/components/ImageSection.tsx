import { Fragment, type ChangeEvent } from 'react';
import { useGen } from '../state/GeneratorContext';

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

type OnKey = 'resemble' | 'embed' | 'watermark';
type IdxKey = 'halftoneIdx' | 'logoIdx' | 'watermarkIdx';
const ROLES: { label: string; onKey: OnKey; idxKey: IdxKey; desc: string }[] = [
  { label: 'Halftone', onKey: 'resemble', idxKey: 'halftoneIdx', desc: 'QR resembles the image' },
  { label: 'Logo', onKey: 'embed', idxKey: 'logoIdx', desc: 'crisp embed — centre/corner' },
  { label: 'Watermark', onKey: 'watermark', idxKey: 'watermarkIdx', desc: 'faint overlay' },
];

/** Image upload (multiple) + an assignment matrix that maps each uploaded
 *  image to the halftone / logo / watermark roles (one image can fill all). */
export function ImageSection() {
  const { cfg, update } = useGen();
  const { images } = cfg;
  const single = images.length === 1;

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

  const tile = (i: number) => (
    <div className="img-tile">
      <img className="img-tile__thumb" src={images[i].src} alt={`Image ${i + 1}`} />
      <span className="img-tile__num">{i + 1}</span>
      <button type="button" className="img-tile__rm" title="Remove image" onClick={() => removeAt(i)}>
        ×
      </button>
    </div>
  );

  const roleCheck = (r: (typeof ROLES)[number]) => (
    <label className="field field--check" key={r.onKey}>
      <input type="checkbox" checked={cfg[r.onKey]} onChange={(e) => update({ [r.onKey]: e.target.checked })} />
      <span className="field__label">
        <b>{r.label}</b> — <span className="img-role__desc">{r.desc}</span>
      </span>
    </label>
  );

  return (
    <div className="image-block">
      <label className="upload">
        <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
        <span className="upload__btn">{images.length ? '＋ Add image(s)' : 'Upload image(s) / logo'}</span>
      </label>

      {images.length === 0 && (
        <>
          <p className="img-hint">Upload an image to use it as a halftone, logo, or watermark. Add several to assign a different image to each.</p>
          {ROLES.map(roleCheck)}
        </>
      )}

      {single && (
        <div className="img-single">
          {tile(0)}
          <div className="img-single__roles">{ROLES.map(roleCheck)}</div>
        </div>
      )}

      {images.length > 1 && (
        <>
          <p className="img-hint">Tick a role, then click a cell to choose which image fills it. One image can fill several.</p>
          <div className="img-matrix" role="grid">
            <div className="img-matrix__corner" />
            {ROLES.map((r) => (
              <label className="img-col" key={r.onKey} title={r.desc}>
                <input type="checkbox" checked={cfg[r.onKey]} onChange={(e) => update({ [r.onKey]: e.target.checked })} />
                <span>{r.label}</span>
              </label>
            ))}

            {images.map((_, i) => (
              <Fragment key={i}>
                {tile(i)}
                {ROLES.map((r) => {
                  const on = cfg[r.onKey];
                  const sel = (cfg[r.idxKey] ?? 0) === i;
                  return (
                    <button
                      type="button"
                      key={r.onKey}
                      className={'img-cell' + (sel ? ' is-sel' : '')}
                      disabled={!on}
                      aria-pressed={sel}
                      title={`Use image ${i + 1} as ${r.label.toLowerCase()}`}
                      onClick={() => update({ [r.idxKey]: i })}
                    >
                      {sel ? '●' : '○'}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
