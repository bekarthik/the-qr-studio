import type { Field as FieldDef } from '../ui/forms';

interface Props {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}

/** Renders one form control from a {@link FieldDef}. Reused by source forms and
 *  the settings panel so every input looks and behaves the same. */
export function Field({ field, value, onChange }: Props) {
  if (field.type === 'checkbox') {
    return (
      <label className="field field--check">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="field__label">{field.label}</span>
      </label>
    );
  }

  return (
    <label className="field">
      <span className="field__label">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea
          rows={3}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'select' ? (
        <select value={String(value ?? field.value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
