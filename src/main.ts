import './style.css';
import { SOURCES } from './ui/forms';
import type { SourceDef } from './ui/forms';
import { buildPayload, type SourceType, type PayloadInput } from './content/payloads';
import { buildMatrix, type ErrorLevel } from './qr/matrix';
import { sampleImage, type ImageSampler } from './qr/halftone';
import { renderQR, type CenterImage } from './qr/render';
import { renderSVG } from './qr/svg';

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
  invert: false,
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
  centerHref: string | null;
}
let currentRender: RenderSnapshot | null = null;

/* -------------------------------------------------------------------- dom */

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const tabsEl = $('#sourceTabs');
const formEl = $('#formFields');
const previewEl = $('#preview');
const hintEl = $('#hint');

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
$('#invert').addEventListener('change', (e) => {
  state.invert = (e.target as HTMLInputElement).checked;
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
    setDownloadsEnabled(false);
    return;
  }

  const useImage = state.image && (state.resemble || state.embed);
  const sampler =
    state.resemble && state.image
      ? sampleImage(state.image, state.image.naturalWidth, state.image.naturalHeight, {
          gridSize: matrix.size * 3,
          threshold: state.threshold,
          invert: state.invert,
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
    centerImage,
  });

  currentCanvas = canvas;
  currentRender = {
    matrix,
    sampler,
    fg: state.fg,
    bg: state.bg,
    protectPatterns: state.protectPatterns,
    centerHref: centerImage && state.image ? state.image.src : null,
  };
  previewEl.innerHTML = '';
  canvas.className = 'qr';
  previewEl.appendChild(canvas);
  setDownloadsEnabled(true);

  // Scannability guidance.
  if (useImage) {
    hintEl.textContent =
      'Tip: image-styled codes use maximum error correction. Always test-scan before printing; lower the “Image detail” or logo size if a phone struggles.';
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
update();
