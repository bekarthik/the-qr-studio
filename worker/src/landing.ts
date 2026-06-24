/** Minimal self-documenting landing page served at GET /. */
export function landingPage(origin: string): string {
  const ex = `${origin}/qr?data=${encodeURIComponent('https://example.com')}&style=brand&brand=%231d4ed8&size=320`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR Studio API</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.6 system-ui, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.2rem; }
  code, pre { font-family: ui-monospace, monospace; }
  pre { background: #8881; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  h1 { margin-bottom: .2rem; } .sub { opacity: .7; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  td, th { text-align: left; padding: .35rem .6rem; border-bottom: 1px solid #8884; vertical-align: top; }
  img { background: #fff; border-radius: 8px; padding: 8px; }
</style>
</head>
<body>
<h1>QR Studio API</h1>
<p class="sub">Image-styled, server-verified scannable QR codes. PNG &amp; SVG.</p>

<p><strong>GET</strong> or <strong>POST</strong> <code>/qr</code></p>
<pre>curl "${origin}/qr?data=https://example.com&amp;format=png" -o qr.png</pre>
<p><img src="${ex}" width="160" height="160" alt="example QR"></p>

<table>
<tr><th>Param</th><th>Default</th><th>Notes</th></tr>
<tr><td>data <em>(required)</em></td><td>—</td><td>payload to encode (≤1200 chars)</td></tr>
<tr><td>format</td><td>png</td><td>png | svg</td></tr>
<tr><td>ec</td><td>H</td><td>error correction: L M Q H</td></tr>
<tr><td>fg / bg</td><td>#000000 / #ffffff</td><td>#rrggbb hex</td></tr>
<tr><td>style</td><td>solid</td><td>solid | brand</td></tr>
<tr><td>brand</td><td>#1d4ed8</td><td>brand colour (auto-darkened to stay scannable)</td></tr>
<tr><td>size</td><td>512</td><td>output px, 64–2048</td></tr>
<tr><td>sub</td><td>3</td><td>sub-cells per module: 3 | 5 | 7</td></tr>
<tr><td>quiet</td><td>4</td><td>quiet-zone modules, 0–8</td></tr>
<tr><td>logo</td><td>—</td><td>base64 <code>data:image/…</code> URL (no remote URLs)</td></tr>
<tr><td>logoRatio / logoPlate</td><td>0.22 / true</td><td>centre-logo box size &amp; backing plate</td></tr>
<tr><td>verify</td><td>true</td><td>round-trip decode check; result in <code>X-QR-Verified</code></td></tr>
</table>

<p>Every PNG is decoded server-side after rendering; the
<code>X-QR-Verified</code> response header is <code>true</code> only when the
output scans back to exactly the payload you sent.</p>
</body>
</html>`;
}
