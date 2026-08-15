import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { after, before, test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 43173;
const origin = `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";

before(async () => {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before tests started:\n${serverOutput}`);
    }
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js did not become ready:\n${serverOutput}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
});

test("server-renders the CREDREP product", async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const html = await response.text();
  assert.match(html, /<title>CREDREP/);
  assert.match(html, /Forecast with reputation/);
  assert.match(html, /Live questions/);
  assert.match(html, /Community/);
  assert.match(html, /Prediction Score/);
  assert.match(html, /Bradbury/);
  assert.match(html, /Connect wallet/);
  assert.match(html, /opengraph-image/);
  assert.doesNotMatch(html, /network-pill|Polymarket · Bradbury/);
  assert.doesNotMatch(
    html,
    /Manchester United|Maya Chen|Make your claim|People backing their word/,
  );
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|Your site is taking shape/,
  );
});

test("serves the CREDREP social preview", async () => {
  const response = await fetch(`${origin}/opengraph-image`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^image\/png\b/i);
  assert.ok((await response.arrayBuffer()).byteLength > 10_000);
});

test("serves launch terms, privacy, and support pages", async () => {
  for (const pathname of ["/terms", "/privacy", "/support"]) {
    const response = await fetch(`${origin}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /PUBLIC BETA|BETA SUPPORT/);
  }
});

test("rejects malformed wallet-index requests before database access", async () => {
  const response = await fetch(`${origin}/api/index`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "A wallet address is required." });
});

test("redirects the conventional favicon path", async () => {
  const response = await fetch(`${origin}/favicon.ico`, { redirect: "manual" });
  assert.equal(response.status, 308);
  assert.equal(
    new URL(response.headers.get("location") ?? origin).pathname,
    "/favicon.svg",
  );
});
