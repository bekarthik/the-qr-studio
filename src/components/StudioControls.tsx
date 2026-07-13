import type { ReactNode } from 'react';
import type { CardTextV, CardTextH } from '../card/card';

/** A pane-level tab bar (Colour / Shape / Image, etc.). */
export function WsTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="ws-subtabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={active === t.id ? 'on' : ''}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A labelled sub-group inside a tab — the "categorisation" unit. */
export function WsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ws-group">
      <span className="ws-group__l">{label}</span>
      {children}
    </div>
  );
}

/** A generic segmented control shared by every studio pane. */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { k: T; l: React.ReactNode }[];
  onChange: (k: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="ws-seg">
      {options.map((o) => (
        <button
          key={String(o.k)}
          type="button"
          className={value === o.k ? 'on' : ''}
          disabled={disabled}
          aria-pressed={value === o.k}
          onClick={() => onChange(o.k)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** A labelled switch row. */
export function Toggle({
  on,
  label,
  onToggle,
  disabled,
}: {
  on: boolean;
  label: React.ReactNode;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="ws-toggle"
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
    >
      <span>{label}</span>
      <span className={'ws-swt' + (on ? ' on' : '')} aria-hidden="true" />
    </button>
  );
}

const V3: CardTextV[] = ['top', 'middle', 'bottom'];
const H3: CardTextH[] = ['left', 'center', 'right'];

/** A compact 3×3 position picker. */
export function PosGrid({
  v,
  h,
  onPick,
  lockTop,
  disabled,
}: {
  v: CardTextV;
  h: CardTextH;
  onPick: (v: CardTextV, h: CardTextH) => void;
  lockTop?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="ws-posgrid" role="group" aria-label="Position">
      {V3.map((vv) =>
        H3.map((hh) => {
          const sel = v === vv && h === hh;
          const dis = disabled || (lockTop && vv !== 'top');
          return (
            <button
              key={vv + hh}
              type="button"
              disabled={dis}
              aria-pressed={sel}
              title={`${vv} ${hh}`}
              className={'ws-posgrid__c' + (sel ? ' is-sel' : '')}
              onClick={() => onPick(vv, hh)}
            />
          );
        }),
      )}
    </div>
  );
}
