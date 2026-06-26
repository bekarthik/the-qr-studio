import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { SOURCES } from '../ui/forms';
import type { SourceType, PayloadInput } from '../content/payloads';
import type { ErrorLevel } from '../qr/matrix';
import type { ColorStyle, ModuleShape } from '../qr/grid';

/** The full generator state — one object so a single change re-renders the tree. */
export interface Config {
  type: SourceType;
  values: Record<string, PayloadInput>;
  image: HTMLImageElement | null;
  resemble: boolean;
  embed: boolean;
  fg: string;
  bg: string;
  errorLevel: ErrorLevel;
  threshold: number;
  autoThreshold: boolean;
  invert: boolean;
  detail: number;
  dotSize: number;
  colorStyle: ColorStyle;
  shape: ModuleShape;
  brandColor: string;
  autoBrand: boolean;
  logoRatio: number;
  plate: boolean;
  protectPatterns: boolean;
}

function initialValues(): Record<string, PayloadInput> {
  const v: Record<string, PayloadInput> = {};
  for (const s of SOURCES) {
    v[s.type] = {};
    for (const f of s.fields) if (f.value !== undefined) v[s.type][f.key] = f.value;
  }
  return v;
}

const INITIAL: Config = {
  type: 'url',
  values: initialValues(),
  image: null,
  resemble: false,
  embed: false,
  fg: '#101418',
  bg: '#ffffff',
  errorLevel: 'H',
  threshold: 0.5,
  autoThreshold: true,
  invert: false,
  detail: 3,
  dotSize: 0,
  colorStyle: 'solid',
  shape: 'square',
  brandColor: '#2563eb',
  autoBrand: false,
  logoRatio: 0.22,
  plate: true,
  protectPatterns: true,
};

interface Ctx {
  cfg: Config;
  update: (patch: Partial<Config>) => void;
  setField: (key: string, value: string | boolean) => void;
}

const GeneratorContext = createContext<Ctx | null>(null);

export function GeneratorProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<Config>(INITIAL);

  const api = useMemo<Ctx>(
    () => ({
      cfg,
      update: (patch) => setCfg((c) => ({ ...c, ...patch })),
      setField: (key, value) =>
        setCfg((c) => ({
          ...c,
          values: { ...c.values, [c.type]: { ...c.values[c.type], [key]: value } },
        })),
    }),
    [cfg],
  );

  return <GeneratorContext.Provider value={api}>{children}</GeneratorContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGen(): Ctx {
  const ctx = useContext(GeneratorContext);
  if (!ctx) throw new Error('useGen must be used inside <GeneratorProvider>');
  return ctx;
}
