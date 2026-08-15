import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { verifyMessage, type Hex } from "viem";
import { walletIndexChallenges } from "../db/schema";
import { normalizeWalletAddress } from "./wallet-address";

const CHALLENGE_TTL_MS = 5 * 60_000;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_COOKIE = "credence_index_session";

export class WalletAuthorizationError extends Error {
  constructor(message = "Wallet authorization is invalid or expired.") {
    super(message);
    this.name = "WalletAuthorizationError";
  }
}

function sessionSecret(): string {
  const configured = process.env.INDEX_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "credence-local-development-index-session";
  }
  throw new Error("INDEX_SESSION_SECRET is not configured.");
}

function signatureFor(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

export function hasValidIndexSession(
  request: Request,
  address: string,
): boolean {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payloadPart = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!safeEqual(providedSignature, signatureFor(payloadPart))) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as { version?: unknown; address?: unknown; expiresAt?: unknown };
    return (
      payload.version === 1 &&
      payload.address === normalizeWalletAddress(address) &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function createIndexSessionCookie(address: string): string {
  const payloadPart = Buffer.from(
    JSON.stringify({
      version: 1,
      address: normalizeWalletAddress(address),
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1_000,
    }),
  ).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${payloadPart}.${signatureFor(payloadPart)}; Path=/api/index; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
}

export async function issueIndexChallenge(request: Request, address: string) {
  const walletAddress = normalizeWalletAddress(address);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const nonce = randomBytes(24).toString("hex");
  const origin = new URL(request.url).origin;
  const message = [
    "CREDREP public-index authorization",
    "",
    `Origin: ${origin}`,
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued at: ${now.toISOString()}`,
    `Expires at: ${expiresAt.toISOString()}`,
    "",
    "Purpose: refresh this wallet's public Bradbury prediction record.",
    "This signature cannot submit a transaction, move funds, or spend REP.",
  ].join("\n");

  const { getDb } = await import("../db");
  await getDb()
    .insert(walletIndexChallenges)
    .values({ walletAddress, nonce, message, expiresAt, usedAt: null })
    .onConflictDoUpdate({
      target: walletIndexChallenges.walletAddress,
      set: { nonce, message, expiresAt, usedAt: null, createdAt: now },
    });

  return { walletAddress, nonce, message, expiresAt: expiresAt.toISOString() };
}

export async function verifyIndexChallenge(input: {
  address: string;
  nonce: string;
  signature: string;
}) {
  const walletAddress = normalizeWalletAddress(input.address);
  if (!/^[0-9a-f]{48}$/i.test(input.nonce)) {
    throw new WalletAuthorizationError();
  }
  if (!/^0x[0-9a-f]{130}$/i.test(input.signature)) {
    throw new WalletAuthorizationError();
  }

  const { getDb } = await import("../db");
  const db = getDb();
  const rows = await db
    .select()
    .from(walletIndexChallenges)
    .where(
      and(
        eq(walletIndexChallenges.walletAddress, walletAddress),
        eq(walletIndexChallenges.nonce, input.nonce),
        isNull(walletIndexChallenges.usedAt),
        gt(walletIndexChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const challenge = rows[0];
  if (!challenge) throw new WalletAuthorizationError();

  const valid = await verifyMessage({
    address: walletAddress,
    message: challenge.message,
    signature: input.signature as Hex,
  });
  if (!valid) throw new WalletAuthorizationError();

  const consumed = await db
    .update(walletIndexChallenges)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(walletIndexChallenges.walletAddress, walletAddress),
        eq(walletIndexChallenges.nonce, input.nonce),
        isNull(walletIndexChallenges.usedAt),
      ),
    )
    .returning({ walletAddress: walletIndexChallenges.walletAddress });
  if (!consumed.length) throw new WalletAuthorizationError();
  return walletAddress;
}
