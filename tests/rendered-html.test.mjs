import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: undefined,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Credence product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Credence/);
  assert.match(html, /Put your reputation on it/);
  assert.match(html, /People backing their word/);
  assert.match(html, /Manchester United/);
  assert.match(html, /Make your claim/);
  assert.match(html, /COUNTERPARTIES/);
  assert.match(html, /not a pool/i);
  assert.match(html, /Bradbury contract live/);
  assert.match(html, /0x1648/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});
