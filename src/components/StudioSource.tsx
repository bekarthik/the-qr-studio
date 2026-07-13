import { SOURCES, CATEGORY_ORDER, CATEGORY_META, SOURCE_CATEGORY } from '../ui/forms';
import { useGen } from '../state/GeneratorContext';
import { SourceForm } from './SourceForm';
import { ImageSection } from './ImageSection';

/**
 * Left pane of the Workstation: a category grid + type selector (wired to the
 * real generator), the source's fields, and the image uploader. Matches the
 * "SOURCE / CONTENT" panes of the design.
 */
export function StudioSource() {
  const { cfg, update } = useGen();
  const currentCat = SOURCE_CATEGORY[cfg.type];
  const inCategory = SOURCES.filter((s) => SOURCE_CATEGORY[s.type] === currentCat);

  const pickCategory = (cat: (typeof CATEGORY_ORDER)[number]) => {
    if (cat === currentCat) return;
    const first = SOURCES.find((s) => SOURCE_CATEGORY[s.type] === cat);
    if (first) update({ type: first.type });
  };

  return (
    <>
      <div className="ws-sec">
        <h4 className="ws-sec__h">
          Source <span>{SOURCES.length} types</span>
        </h4>
        <div className="ws-cats" role="tablist" aria-label="Source category">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={cat === currentCat}
              className={'ws-cat' + (cat === currentCat ? ' on' : '')}
              onClick={() => pickCategory(cat)}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        {inCategory.length > 1 && (
          <div className="ws-field">
            <label>Type</label>
            <select
              className="ws-inp"
              value={cfg.type}
              onChange={(e) => update({ type: e.target.value as typeof cfg.type })}
            >
              {inCategory.map((s) => (
                <option key={s.type} value={s.type}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <SourceForm />
      </div>

      <div className="ws-sec">
        <h4 className="ws-sec__h">
          Image <span className="ws-opt">optional</span>
        </h4>
        <ImageSection />
      </div>
    </>
  );
}
