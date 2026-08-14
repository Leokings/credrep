import {
  createIndexSessionCookie,
  hasValidIndexSession,
  verifyIndexChallenge,
  WalletAuthorizationError,
} from "../../../lib/index-auth";
import { indexBradburyWallet } from "../../../lib/chain-indexer";
import {
  clientAddress,
  enforceRateLimit,
  RateLimitError,
} from "../../../lib/rate-limit";
import { createRequestLogger } from "../../../lib/server-logging";
import { normalizeWalletAddress } from "../../../lib/wallet-address";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const log = createRequestLogger(request, "/api/index");
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4_096) {
      log.done(413);
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = (await request.json()) as {
      address?: unknown;
      nonce?: unknown;
      signature?: unknown;
    };
    if (typeof body.address !== "string") {
      log.done(400);
      return Response.json({ error: "A wallet address is required." }, { status: 400 });
    }
    const address = normalizeWalletAddress(body.address);

    await Promise.all([
      enforceRateLimit({
        scope: "index_ip",
        subject: clientAddress(request),
        limit: 30,
        windowSeconds: 15 * 60,
      }),
      enforceRateLimit({
        scope: "index_wallet",
        subject: address,
        limit: 30,
        windowSeconds: 15 * 60,
      }),
    ]);

    let setCookie: string | null = null;
    if (!hasValidIndexSession(request, address)) {
      if (typeof body.nonce !== "string" || typeof body.signature !== "string") {
        log.done(401, { authorizationRequired: true });
        return Response.json(
          {
            error: "Sign once with this wallet to refresh its public index.",
            code: "WALLET_SIGNATURE_REQUIRED",
          },
          { status: 401 },
        );
      }
      await verifyIndexChallenge({
        address,
        nonce: body.nonce,
        signature: body.signature,
      });
      setCookie = createIndexSessionCookie(address);
    }

    const result = await indexBradburyWallet(address);
    log.done(200, { indexed: result.indexed, positions: result.positions });
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        ...(setCookie ? { "Set-Cookie": setCookie } : {}),
      },
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
    if (error instanceof WalletAuthorizationError) {
      log.done(401);
      return Response.json(
        { error: error.message, code: "WALLET_SIGNATURE_REQUIRED" },
        { status: 401 },
      );
    }
    const message = error instanceof Error ? error.message : "Wallet sync failed.";
    const status = message.includes("valid EVM wallet") ? 400 : 502;
    log.failed(error, status);
    return Response.json(
      { error: status === 400 ? message : "Wallet sync is temporarily unavailable." },
      { status },
    );
  }
}
