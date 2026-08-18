import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { apiRateLimits } from "../db/schema";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Try again shortly.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function rateLimitSecret(): string {
  const configured = process.env.RATE_LIMIT_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "credrep-local-development-rate-limit";
  }
  throw new Error("RATE_LIMIT_SECRET is not configured.");
}

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function enforceRateLimit(options: {
  scope: string;
  subject: string;
  limit: number;
  windowSeconds: number;
}) {
  const nowMs = Date.now();
  const windowMs = options.windowSeconds * 1_000;
  const windowStartedMs = Math.floor(nowMs / windowMs) * windowMs;
  const expiresAtMs = windowStartedMs + windowMs;
  const secret = rateLimitSecret();
  const subjectHash = createHmac("sha256", secret)
    .update(options.subject)
    .digest("hex");
  const id = createHmac("sha256", secret)
    .update(`${options.scope}:${subjectHash}:${windowStartedMs}`)
    .digest("hex");

  const { getDb } = await import("../db");
  const rows = await getDb()
    .insert(apiRateLimits)
    .values({
      id,
      scope: options.scope,
      subjectHash,
      windowStartedAt: new Date(windowStartedMs),
      expiresAt: new Date(expiresAtMs),
      count: 1,
    })
    .onConflictDoUpdate({
      target: apiRateLimits.id,
      set: { count: sql`${apiRateLimits.count} + 1` },
    })
    .returning({ count: apiRateLimits.count });

  if ((rows[0]?.count ?? options.limit + 1) > options.limit) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((expiresAtMs - nowMs) / 1_000)),
    );
  }
}
