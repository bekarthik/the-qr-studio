import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { SOURCES } from '../ui/forms';
import type { SourceType, PayloadInput } from '../content/payloads';
import type { ErrorLevel } from '../qr/matrix';
import type { ColorStyle, ModuleShape, EyeShape } from '../qr/grid';
import type { CardBgStyle, CardPattern, CardText, CardOrientation } from '../card/card';

/** The full generator state — one object so a single change re-renders the tree. */
export interface Config {
  type: SourceType;
  values: Record<string, PayloadInput>;
  image: HTMLImageElement | null;
  resemble: boolean;
  embed: boolean;
  watermark: boolean;
  watermarkPos: 'across' | 'br';
  watermarkOpacity: number;
  cardTwoSided: boolean;
  cardName: string;
  // Visiting-card design.
  cardBgStyle: CardBgStyle;
  cardBg1: string;
  cardBg2: string;
  cardGradAngle: number;
  cardPattern: CardPattern;
  cardAccentAuto: boolean;
  cardAccent: string;
  cardText: CardText;
  cardAccentBar: boolean;
  cardBorder: boolean;
  cardPanel: boolean;
  cardOrientation: CardOrientation;
  cardHeadingFont: string;
  cardBodyFont: string;
  cardCaption: string;
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
  eyeShape: EyeShape;
  eyeColor: string;
  autoEyeColor: boolean;
  brandColor: string;
  autoBrand: boolean;
  logoRatio: number;
  embedPos: 'center' | 'br';
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
  watermark: false,
  watermarkPos: 'across',
  watermarkOpacity: 0.12,
  cardTwoSided: false,
  cardName: '',
  cardBgStyle: 'solid',
  cardBg1: '#fffdf8',
  cardBg2: '#efe7d6',
  cardGradAngle: 135,
  cardPattern: 'dots',
  cardAccentAuto: true,
  cardAccent: '#e0522e',
  cardText: 'auto',
  cardAccentBar: true,
  cardBorder: true,
  cardPanel: true,
  cardOrientation: 'landscape',
  cardHeadingFont: "'Helvetica Neue', Arial, sans-serif",
  cardBodyFont: "'Helvetica Neue', Arial, sans-serif",
  cardCaption: '',
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
  eyeShape: 'auto',
  eyeColor: '#101418',
  autoEyeColor: true,
  brandColor: '#2563eb',
  autoBrand: false,
  logoRatio: 0.22,
  embedPos: 'center',
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
