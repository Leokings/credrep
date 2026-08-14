import { issueIndexChallenge } from "../../../../lib/index-auth";
import {
  clientAddress,
  enforceRateLimit,
  RateLimitError,
} from "../../../../lib/rate-limit";
import { createRequestLogger } from "../../../../lib/server-logging";
import { normalizeWalletAddress } from "../../../../lib/wallet-address";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const log = createRequestLogger(request, "/api/index/challenge");
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_048) {
      log.done(413);
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = (await request.json()) as { address?: unknown };
    if (typeof body.address !== "string") {
      log.done(400);
      return Response.json({ error: "A wallet address is required." }, { status: 400 });
    }
    const address = normalizeWalletAddress(body.address);
    await Promise.all([
      enforceRateLimit({
        scope: "index_challenge_ip",
        subject: clientAddress(request),
        limit: 10,
        windowSeconds: 15 * 60,
      }),
      enforceRateLimit({
        scope: "index_challenge_wallet",
        subject: address,
        limit: 5,
        windowSeconds: 15 * 60,
      }),
    ]);

    const challenge = await issueIndexChallenge(request, address);
    log.done(200);
    return Response.json(challenge, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      log.done(400);
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      log.done(429);
      return Response.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    const message = error instanceof Error ? error.message : "Challenge unavailable.";
    const status = message.includes("valid EVM wallet") ? 400 : 503;
    log.failed(error, status);
    return Response.json(
      { error: status === 400 ? message : "Wallet authorization is temporarily unavailable." },
      { status },
    );
  }
}
