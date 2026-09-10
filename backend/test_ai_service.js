/**
 * Smoke test for the AI analyze endpoint.
 *
 * Default: mocked fetch (no network) — safe for local/CI.
 * Live:    AI_SERVICE_SMOKE_LIVE=1 node test_ai_service.js
 * Optional: AI_SERVICE_URL=https://... (defaults to deployed Render URL when live)
 */
async function test() {
  const live = process.env.AI_SERVICE_SMOKE_LIVE === '1';
  const aiServiceUrl =
    process.env.AI_SERVICE_URL || 'https://drippeacock-sih.onrender.com';

  const imageBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
    'base64'
  );
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/gif' }), 'test.gif');

  const url = `${aiServiceUrl}/analyze`;

  if (!live) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true, mocked: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    try {
      console.log('Mock mode (set AI_SERVICE_SMOKE_LIVE=1 for live request)');
      console.log('Sending request to:', url);
      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) {
        throw new Error(`Unexpected status: ${response.status}`);
      }
      const text = await response.text();
      console.log('Status:', response.status);
      console.log('Response:', text);
    } catch (err) {
      console.error('Fetch failed:', err);
      process.exitCode = 1;
      throw err;
    } finally {
      globalThis.fetch = originalFetch;
    }
    return;
  }

  console.log('Live mode — Sending request to:', url);
  try {
    const response = await fetch(url, { method: 'POST', body: formData });
    console.log('Status:', response.status);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exitCode = 1;
    throw err;
  }
}

test().catch(() => {
  process.exitCode = 1;
});
