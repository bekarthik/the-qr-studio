import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QrStudio, QrStudioError } from '../src/index.ts';

/** A tiny fetch double that records the last call and returns a scripted response. */
function mockFetch(response: {
  status?: number;
  headers?: Record<string, string>;
  body?: Uint8Array | string;
}) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const body = response.body ?? new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic
    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
    return new Response(bytes as unknown as BodyInit, {
      status: response.status ?? 200,
      headers: response.headers ?? { 'content-type': 'image/png' },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

test('requires a baseUrl', () => {
  assert.throws(() => new QrStudio({ baseUrl: '' } as never), TypeError);
  // @ts-expect-error - intentionally omitting baseUrl
  assert.throws(() => new QrStudio({}), TypeError);
});

test('normalises baseUrl (trailing slash and /qr suffix) to a single /qr endpoint', () => {
  const { impl, calls } = mockFetch({});
  for (const base of ['https://x.dev', 'https://x.dev/', 'https://x.dev/qr', 'https://x.dev/v1/qr']) {
    const qr = new QrStudio({ baseUrl: base, fetch: impl });
    const u = qr.url({ data: 'hi' });
    assert.ok(u.startsWith('https://x.dev/qr?'), `got ${u}`);
  }
  assert.equal(calls.length, 0, 'url() must not perform a request');
});

test('url() serialises only provided options', () => {
  const { impl } = mockFetch({});
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  const u = new URL(qr.url({ data: 'https://example.com', style: 'brand', size: 320 }));
  assert.equal(u.searchParams.get('data'), 'https://example.com');
  assert.equal(u.searchParams.get('style'), 'brand');
  assert.equal(u.searchParams.get('size'), '320');
  assert.equal(u.searchParams.get('ec'), null, 'omitted options must not be sent');
});

test('generate() POSTs JSON and parses PNG + verified header', async () => {
  const { impl, calls } = mockFetch({ headers: { 'content-type': 'image/png', 'x-qr-verified': 'true' } });
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  const res = await qr.generate({ data: 'hi', verify: true });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.method, 'POST');
  assert.match(String((calls[0].init?.headers as Record<string, string>)['Content-Type']), /application\/json/);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { data: 'hi', verify: 'true' });

  assert.equal(res.format, 'png');
  assert.equal(res.verified, true);
  assert.deepEqual([...res.bytes.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});

test('verified is null when the header is absent', async () => {
  const { impl } = mockFetch({ headers: { 'content-type': 'image/png' } });
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  const res = await qr.generate({ data: 'hi', verify: false });
  assert.equal(res.verified, null);
});

test('svg() returns markup and sets format', async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  const { impl } = mockFetch({ headers: { 'content-type': 'image/svg+xml; charset=utf-8' }, body: svg });
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  const out = await qr.svg({ data: 'hi' });
  assert.equal(out, svg);
});

test('dataUrl() base64-encodes the bytes with the right mime', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const { impl } = mockFetch({ headers: { 'content-type': 'image/png' }, body: png });
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  const url = await qr.dataUrl({ data: 'hi' });
  assert.ok(url.startsWith('data:image/png;base64,'));
  const b64 = url.slice('data:image/png;base64,'.length);
  assert.deepEqual([...Buffer.from(b64, 'base64')], [...png]);
});

test('non-2xx throws QrStudioError with the API error message', async () => {
  const { impl } = mockFetch({
    status: 400,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: '`data` is required' }),
  });
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  await assert.rejects(
    () => qr.generate({ data: 'x' }),
    (err: unknown) => {
      assert.ok(err instanceof QrStudioError);
      assert.equal(err.status, 400);
      assert.equal(err.message, '`data` is required');
      return true;
    },
  );
});

test('requires data', () => {
  const { impl } = mockFetch({});
  const qr = new QrStudio({ baseUrl: 'https://x.dev', fetch: impl });
  assert.throws(() => qr.url({ data: '' }), TypeError);
});
