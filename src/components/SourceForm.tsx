import { SOURCES } from '../ui/forms';
import { useGen } from '../state/GeneratorContext';
import { Field } from './Field';

/** Renders the input fields for the currently-selected source, plus any note. */
export function SourceForm() {
  const { cfg, setField } = useGen();
  const def = SOURCES.find((s) => s.type === cfg.type)!;
  const store = cfg.values[cfg.type] ?? {};

  return (
    <div className="form">
      {def.fields.map((f) => (
        <Field key={f.key} field={f} value={store[f.key]} onChange={(v) => setField(f.key, v)} />
      ))}
      {def.note && <p className="form__note">{def.note}</p>}
    </div>
  );
}
