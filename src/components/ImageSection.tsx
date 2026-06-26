import type { ChangeEvent } from 'react';
import { useGen } from '../state/GeneratorContext';

/** Image upload + the two image-feature toggles (halftone / centre embed). */
export function ImageSection() {
  const { cfg, update } = useGen();

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => update({ image: img });
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="image-block">
      <label className="upload">
        <input type="file" accept="image/*" hidden onChange={onFile} />
        <span className="upload__btn">Upload image / logo</span>
        {cfg.image && <img className="thumb show" src={cfg.image.src} alt="" />}
      </label>

      <label className="field field--check">
        <input
          type="checkbox"
          checked={cfg.resemble}
          onChange={(e) => update({ resemble: e.target.checked })}
        />
        <span className="field__label">
          Make the QR <b>resemble</b> the image (halftone)
        </span>
      </label>
      <label className="field field--check">
        <input type="checkbox" checked={cfg.embed} onChange={(e) => update({ embed: e.target.checked })} />
        <span className="field__label">
          <b>Embed</b> the image (crisp logo — centre or corner)
        </span>
      </label>
      <label className="field field--check">
        <input
          type="checkbox"
          checked={cfg.watermark}
          onChange={(e) => update({ watermark: e.target.checked })}
        />
        <span className="field__label">
          Add the image as a faint <b>watermark</b>
        </span>
      </label>
    </div>
  );
}
