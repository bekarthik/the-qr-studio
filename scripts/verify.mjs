/**
 * Headless scannability check. Builds the matrix with the SAME function-pattern
 * mask the app uses (imported from the compiled core), renders it the way
 * render.ts does (3x3 sub-cell expansion; centre keeps the data, surrounding
 * cells follow a synthetic "image", function patterns stay solid), then decodes
 * with jsQR to prove the halftone + centre-embed output stays machine-readable.
 *
 * Run: node scripts/verify.mjs
 */
import jsQR from 'jsqr';

// Node 22 strips TS types natively, so we import the app's real core directly.
const { buildMatrix } = await import('../src/qr/matrix.ts');

const CELL = 8; // px per sub-cell
const QUIET = 4; // modules

// A synthetic "logo": dark disc on light ground — a representative halftone source.
function imageDark(subRow, subCol, gridSize) {
  const cx = gridSize / 2;
  const d = Math.hypot(subRow - cx, subCol - cx);
  return d < gridSize * 0.34;
}

function render(text, { halftone = false, embed = false } = {}) {
  const m = buildMatrix(text, 'H');
  const n = m.size;
  const sub = 3;
  const quietSub = QUIET * sub;
  const grid = n * sub + 2 * quietSub;
  const dim = grid * CELL;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255); // white

  const imgGrid = n * sub;
  const setBlack = (sr, sc) => {
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const px = ((sr * CELL + y) * dim + (sc * CELL + x)) * 4;
        data[px] = data[px + 1] = data[px + 2] = 0;
      }
    }
  };

  // Centre-embed carve region (snapped to module bounds) at ratio 0.22.
  const ratio = 0.22;
  const boxModules = Math.round(n * ratio);
  const start = Math.floor((n - boxModules) / 2);
  const end = start + boxModules;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const moduleDark = m.get(r, c);
      const fn = m.isFunction(r, c);
      const inEmbed = embed && r >= start && r < end && c >= start && c < end;
      for (let dr = 0; dr < sub; dr++) {
        for (let dc = 0; dc < sub; dc++) {
          if (inEmbed) continue; // carved empty
          const isCenter = dr === 1 && dc === 1;
          let dark = moduleDark;
          if (halftone && !isCenter && !fn) {
            dark = imageDark(r * sub + dr, c * sub + dc, imgGrid);
          }
          if (dark) setBlack(quietSub + r * sub + dr, quietSub + c * sub + dc);
        }
      }
    }
  }
  return { data, dim, version: m.version };
}

const cases = [
  { name: 'plain url', text: 'https://example.com/welcome', opts: {} },
  { name: 'halftone url', text: 'https://example.com/welcome', opts: { halftone: true } },
  { name: 'halftone + embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, embed: true } },
  {
    name: 'halftone vcard',
    text: 'BEGIN:VCARD\nVERSION:3.0\nN:Rao;Asha;;;\nFN:Asha Rao\nORG:Acme Pvt Ltd\nTEL;TYPE=CELL:+919876543210\nEMAIL:asha@acme.com\nURL:https://acme.com\nEND:VCARD',
    opts: { halftone: true },
  },
  { name: 'halftone + embed wifi', text: 'WIFI:T:WPA;S:MyNetwork;P:s3cr3t-pass;H:false;;', opts: { halftone: true, embed: true } },
];

let pass = 0;
for (const c of cases) {
  const { data, dim, version } = render(c.text, c.opts);
  const res = jsQR(data, dim, dim);
  const ok = res && res.data === c.text;
  console.log(
    `${ok ? '✅' : '❌'}  ${c.name.padEnd(22)} v${version} ${dim}px  ` +
      (ok ? 'decoded OK' : `FAILED (${res ? 'wrong text' : 'no decode'})`),
  );
  if (ok) pass++;
}
console.log(`\n${pass}/${cases.length} scannable`);
process.exit(pass === cases.length ? 0 : 1);
