import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { SOURCES } from '../ui/forms';
import type { SourceType, PayloadInput } from '../content/payloads';
import type { ErrorLevel } from '../qr/matrix';
import type { ColorStyle, ModuleShape, EyeShape } from '../qr/grid';
import type { CardBgStyle, CardPattern, CardText, CardOrientation, CardDivider, CardGraphic, CardTextV, CardTextH } from '../card/card';

/** Which feature an uploaded image is assigned to. */
export type ImageRole = 'halftone' | 'logo' | 'watermark';

/** The full generator state — one object so a single change re-renders the tree. */
export interface Config {
  type: SourceType;
  values: Record<string, PayloadInput>;
  /** All uploaded images; any one can be assigned to multiple roles. */
  images: HTMLImageElement[];
  /** Index into `images` for each role (defaults to 0 — one image for all). */
  halftoneIdx: number;
  logoIdx: number;
  watermarkIdx: number;
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
  cardDivider: CardDivider;
  cardGraphic: CardGraphic;
  cardExactQr: boolean;
  cardShowCaption: boolean;
  cardTextV: CardTextV;
  cardTextH: CardTextH;
  cardLogoShow: boolean;
  cardLogoV: CardTextV;
  cardLogoH: CardTextH;
  cardLogoSize: number;
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
  images: [],
  halftoneIdx: 0,
  logoIdx: 0,
  watermarkIdx: 0,
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
  cardDivider: 'line',
  cardGraphic: 'none',
  cardExactQr: false,
  cardShowCaption: true,
  cardTextV: 'top',
  cardTextH: 'left',
  cardLogoShow: true,
  cardLogoV: 'bottom',
  cardLogoH: 'right',
  cardLogoSize: 0.42,
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

/** The image assigned to a given role, or null if none uploaded. */
// eslint-disable-next-line react-refresh/only-export-components
export function roleImage(cfg: Config, role: ImageRole): HTMLImageElement | null {
  const idx = role === 'halftone' ? cfg.halftoneIdx : role === 'logo' ? cfg.logoIdx : cfg.watermarkIdx;
  return cfg.images[idx] ?? cfg.images[0] ?? null;
}

/**
 * A single representative image (for brand-colour auto-detect): prefer the
 * logo, then the halftone source, then the first uploaded.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function primaryImage(cfg: Config): HTMLImageElement | null {
  return roleImage(cfg, 'logo') ?? roleImage(cfg, 'halftone') ?? cfg.images[0] ?? null;
}
