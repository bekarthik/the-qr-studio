import './style.css';
import { SOURCES } from './ui/forms';
import type { SourceDef } from './ui/forms';
import { buildPayload, type SourceType, type PayloadInput } from './content/payloads';
import { buildMatrix, type ErrorLevel } from './qr/matrix';
import { sampleImage, extractBrandColor, type ImageSampler } from './qr/halftone';
import { renderQR, type CenterImage } from './qr/render';
import { renderSVG } from './qr/svg';
import jsQR from 'jsqr';

/* ------------------------------------------------------------------ state */

const state = {
  type: 'url' as SourceType,
  values: {} as Record<SourceType, PayloadInput>,
  image: null as HTMLImageElement | null,
  resemble: false,
  embed: false,
  fg: '#101418',
  bg: '#ffffff',
  errorLevel: 'H' as ErrorLevel,
  threshold: 0.5,
  autoThreshold: true,
  invert: false,
  detail: 3, // sub-cells per module (3 standard, 5 = finer)
  autotune: true, // raise halftone detail for dense codes so they still scan
  dither: true, // Floyd–Steinberg dither for smoother halftone tone
  colorStyle: 'solid' as 'solid' | 'brand' | 'image',
  brandColor: '#2563eb',
  autoBrand: false,
  logoRatio: 0.22,
  plate: true,
  protectPatterns: true,
};

SOURCES.forEach((s) => {
  state.values[s.type] = {};
  s.fields.forEach((f) => {
    if (f.value !== undefined) state.values[s.type][f.key] = f.value;
  });
});

let currentCanvas: HTMLCanvasElement | null = null;

/** Inputs of the latest successful render, reused for vector (SVG) export. */
interface RenderSnapshot {
  matrix: ReturnType<typeof buildMatrix>;
  sampler: ImageSampler | null;
  fg: string;
  bg: string;
  protectPatterns: boolean;
  colorStyle: 'solid' | 'brand' | 'image';
  brandColor: string;
  sub: number;
  centerHref: string | null;
}
let currentRender: RenderSnapshot | null = null;

/* -------------------------------------------------------------------- dom */

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const tabsEl = $('#sourceTabs');
const formEl = $('#formFields');
const previewEl = $('#preview');
const hintEl = $('#hint');
const badgeEl = $('#verifyBadge');

/* ----------------------------------------------------- scannability badge */

/** Decode the rendered canvas with jsQR to prove it actually scans. */
function isScannable(canvas: HTMLCanvasElement, payload: string): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const res = jsQR(data, width, height);
  return Boolean(res) && res!.data === payload;
}

type Badge = 'hidden' | 'checking' | 'ok' | 'fail';
function setBadge(state: Badge, note = '') {
  badgeEl.className = `badge badge--${state}`;
  if (state === 'hidden') badgeEl.textContent = '';
  else if (state === 'checking') badgeEl.textContent = 'Checking scannability…';
  else if (state === 'ok') badgeEl.textContent = '✓ Verified scannable';
  else badgeEl.textContent = note || '⚠ May not scan — lower detail/logo size or raise contrast';
}

let verifyToken = 0;
/** Verify off the critical path so typing stays smooth; ignore stale runs. */
function scheduleVerify(canvas: HTMLCanvasElement, payload: string) {
  const token = ++verifyToken;
  setBadge('checking');
  setTimeout(() => {
    if (token !== verifyToken) return;
    let ok = false;
    try {
      ok = isScannable(canvas, payload);
    } catch {
      ok = false;
    }
    if (token !== verifyToken) return;
    setBadge(ok ? 'ok' : 'fail');
  }, 200);
}

/* ------------------------------------------------------------- build tabs */

SOURCES.forEach((s) => {
  const btn = document.createElement('button');
  btn.className = 'tab';
  btn.dataset.type = s.type;
  btn.innerHTML = `<span class="ico">${s.icon}</span>${s.label}`;
  btn.addEventListener('click', () => {
    state.type = s.type;
    renderTabs();
    renderForm();
    update();
  });
  tabsEl.appendChild(btn);
});

function renderTabs() {
  tabsEl.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.type === state.type);
  });
}

/* ------------------------------------------------------------- build form */

function renderForm() {
  const def = SOURCES.find((s) => s.type === state.type) as SourceDef;
  const store = state.values[state.type];
  formEl.innerHTML = '';

  def.fields.forEach((f) => {
    const wrap = document.createElement('label');
    wrap.className = 'field' + (f.type === 'checkbox' ? ' field--check' : '');

    const span = document.createElement('span');
    span.className = 'field__label';
    span.textContent = f.label;

    let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      (input as HTMLTextAreaElement).rows = 3;
    } else if (f.type === 'select') {
      const sel = document.createElement('select');
      (f.options || []).forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        sel.appendChild(opt);
      });
      input = sel;
    } else {
      input = document.createElement('input');
      (input as HTMLInputElement).type = f.type;
    }

    if (f.placeholder && 'placeholder' in input) input.placeholder = f.placeholder;

    if (f.type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(store[f.key]);
      input.addEventListener('change', () => {
        store[f.key] = (input as HTMLInputElement).checked;
        update();
      });
      wrap.append(input, span);
    } else {
      const v = store[f.key];
      if (v !== undefined) (input as HTMLInputElement).value = String(v);
      input.addEventListener('input', () => {
        store[f.key] = (input as HTMLInputElement).value;
        update();
      });
      wrap.append(span, input);
    }
    formEl.appendChild(wrap);
  });

  if (def.note) {
    const note = document.createElement('p');
    note.className = 'form__note';
    note.textContent = def.note;
    formEl.appendChild(note);
  }
}

/* ----------------------------------------------------------- style inputs */

$('#fgColor').addEventListener('input', (e) => {
  state.fg = (e.target as HTMLInputElement).value;
  update();
});
$('#bgColor').addEventListener('input', (e) => {
  state.bg = (e.target as HTMLInputElement).value;
  update();
});
$('#errLevel').addEventListener('change', (e) => {
  state.errorLevel = (e.target as HTMLSelectElement).value as ErrorLevel;
  update();
});
$('#threshold').addEventListener('input', (e) => {
  state.threshold = Number((e.target as HTMLInputElement).value) / 100;
  update();
});
$('#autoThreshold').addEventListener('change', (e) => {
  state.autoThreshold = (e.target as HTMLInputElement).checked;
  ($('#threshold') as HTMLInputElement).disabled = state.autoThreshold;
  update();
});
$('#detail').addEventListener('change', (e) => {
  state.detail = Number((e.target as HTMLSelectElement).value);
  update();
});
$('#autotune').addEventListener('change', (e) => {
  state.autotune = (e.target as HTMLInputElement).checked;
  update();
});
$('#dither').addEventListener('change', (e) => {
  state.dither = (e.target as HTMLInputElement).checked;
  update();
});
$('#autoBrand').addEventListener('change', (e) => {
  state.autoBrand = (e.target as HTMLInputElement).checked;
  ($('#brandColor') as HTMLInputElement).disabled = state.autoBrand;
  update();
});
$('#invert').addEventListener('change', (e) => {
  state.invert = (e.target as HTMLInputElement).checked;
  update();
});
$('#colorStyle').addEventListener('change', (e) => {
  state.colorStyle = (e.target as HTMLSelectElement).value as typeof state.colorStyle;
  document.body.classList.toggle('brand-on', state.colorStyle === 'brand');
  update();
});
$('#brandColor').addEventListener('input', (e) => {
  state.brandColor = (e.target as HTMLInputElement).value;
  update();
});
$('#logoRatio').addEventListener('input', (e) => {
  state.logoRatio = Number((e.target as HTMLInputElement).value) / 100;
  update();
});
$('#plate').addEventListener('change', (e) => {
  state.plate = (e.target as HTMLInputElement).checked;
  update();
});
$('#protectPatterns').addEventListener('change', (e) => {
  state.protectPatterns = (e.target as HTMLInputElement).checked;
  update();
});

$('#optResemble').addEventListener('change', (e) => {
  state.resemble = (e.target as HTMLInputElement).checked;
  syncErrorLevel();
  update();
});
$('#optEmbed').addEventListener('change', (e) => {
  state.embed = (e.target as HTMLInputElement).checked;
  syncErrorLevel();
  update();
});

/** Force high error correction whenever an image feature is active. */
function syncErrorLevel() {
  if (state.resemble || state.embed) {
    state.errorLevel = 'H';
    ($('#errLevel') as HTMLSelectElement).value = 'H';
    ($('#errLevel') as HTMLSelectElement).disabled = true;
  } else {
    ($('#errLevel') as HTMLSelectElement).disabled = false;
  }
}

/* --------------------------------------------------------- image loading */

$('#imageInput').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      $('#imgThumb').setAttribute('src', img.src);
      $('#imgThumb').classList.add('show');
      update();
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

/* -------------------------------------------------------------- download */

function saveBlob(blob: Blob, ext: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qr-${state.type}.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('#downloadPng').addEventListener('click', () => {
  if (!currentCanvas) return;
  currentCanvas.toBlob((blob) => blob && saveBlob(blob, 'png'), 'image/png');
});

$('#downloadSvg').addEventListener('click', () => {
  if (!currentRender) return;
  const svg = renderSVG({
    matrix: currentRender.matrix,
    quietModules: 4,
    fg: currentRender.fg,
    bg: currentRender.bg,
    sampler: currentRender.sampler,
    protectPatterns: currentRender.protectPatterns,
    colorStyle: currentRender.colorStyle,
    brandColor: currentRender.brandColor,
    sub: currentRender.sub,
    centerImage: currentRender.centerHref
      ? { href: currentRender.centerHref, ratio: state.logoRatio, plate: state.plate }
      : null,
    pixelSize: RES,
  });
  saveBlob(new Blob([svg], { type: 'image/svg+xml' }), 'svg');
});

/* ---------------------------------------------------------- render cycle */

const RES = 1600;

function setDownloadsEnabled(on: boolean) {
  ($('#downloadPng') as HTMLButtonElement).disabled = !on;
  ($('#downloadSvg') as HTMLButtonElement).disabled = !on;
}

function update() {
  const payload = buildPayload(state.type, state.values[state.type]);
  if (!payload) {
    previewEl.innerHTML = '<div class="empty">Fill in the details to generate a QR code.</div>';
    currentCanvas = null;
    currentRender = null;
    hintEl.textContent = '';
    setBadge('hidden');
    setDownloadsEnabled(false);
    return;
  }

  let matrix;
  try {
    matrix = buildMatrix(payload, state.errorLevel);
  } catch (err) {
    previewEl.innerHTML = `<div class="empty err">Too much data for one QR code.<br><small>${
      (err as Error).message
    }</small></div>`;
    currentCanvas = null;
    currentRender = null;
    setBadge('hidden');
    setDownloadsEnabled(false);
    return;
  }

  const useImage = state.image && (state.resemble || state.embed);

  // Optional auto-tune: dense codes (higher versions) lose too much data at
  // standard halftone detail — only the centre 1/9 of each module stays true.
  // Bump to High detail (protected centre 3×3 = 9/25) so they keep scanning.
  // Only escalates; never lowers a manual choice, and only when halftoning.
  const autoTuned = state.resemble && state.autotune && matrix.version >= 4;
  const detail = autoTuned ? Math.max(state.detail, 5) : state.detail;

  // Auto-detect brand colour from the uploaded image when requested.
  if (state.autoBrand && state.image && state.colorStyle === 'brand') {
    state.brandColor = extractBrandColor(state.image, state.image.naturalWidth, state.image.naturalHeight);
    ($('#brandColor') as HTMLInputElement).value = state.brandColor;
  }

  // At High detail, low-pass the source so background texture doesn't alias
  // into speckle (which image-colours' compressed contrast can't absorb).
  const smooth = detail >= 5 ? 1 : 0;

  const sampler =
    state.resemble && state.image
      ? sampleImage(state.image, state.image.naturalWidth, state.image.naturalHeight, {
          gridSize: matrix.size * detail,
          threshold: state.threshold,
          invert: state.invert,
          auto: state.autoThreshold,
          smooth,
          dither: state.dither,
        })
      : null;

  let centerImage: CenterImage | null = null;
  if (state.embed && state.image) {
    centerImage = {
      source: state.image,
      width: state.image.naturalWidth,
      height: state.image.naturalHeight,
      ratio: state.logoRatio,
      plate: state.plate,
    };
  }

  const canvas = renderQR({
    matrix,
    targetPx: RES,
    quietModules: 4,
    fg: state.fg,
    bg: state.bg,
    sampler,
    protectPatterns: state.protectPatterns,
    colorStyle: state.colorStyle,
    brandColor: state.brandColor,
    sub: detail,
    centerImage,
  });

  currentCanvas = canvas;
  currentRender = {
    matrix,
    sampler,
    fg: state.fg,
    bg: state.bg,
    protectPatterns: state.protectPatterns,
    colorStyle: state.colorStyle,
    brandColor: state.brandColor,
    sub: detail,
    centerHref: centerImage && state.image ? state.image.src : null,
  };
  previewEl.innerHTML = '';
  canvas.className = 'qr';
  previewEl.appendChild(canvas);
  setDownloadsEnabled(true);
  scheduleVerify(canvas, payload);

  // Scannability guidance.
  if (useImage) {
    hintEl.textContent = autoTuned
      ? 'Auto-tuned to High detail so this denser code stays scannable. Turn off “Auto-tune detail” to override. Always test-scan before printing.'
      : 'Tip: image-styled codes use maximum error correction. Always test-scan before printing; lower the “Image detail” or logo size if a phone struggles.';
  } else {
    hintEl.textContent = `Version ${matrix.version} · ${matrix.size}×${matrix.size} modules · error correction ${state.errorLevel}.`;
  }

  // Toggle visibility of image-related controls.
  document.body.classList.toggle('has-image', Boolean(state.image));
  document.body.classList.toggle('resemble-on', state.resemble);
  document.body.classList.toggle('embed-on', state.embed);
}

/* ------------------------------------------------------------------ init */

renderTabs();
renderForm();
syncErrorLevel();
($('#threshold') as HTMLInputElement).disabled = state.autoThreshold;
($('#brandColor') as HTMLInputElement).disabled = state.autoBrand;
update();
