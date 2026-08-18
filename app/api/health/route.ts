import { count, eq } from "drizzle-orm";
import { chainProfiles, sourcedMarkets } from "../../../db/schema";
import { CREDREP_CONTRACT_ADDRESS } from "../../../lib/deployment";
import { createRequestLogger } from "../../../lib/server-logging";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const log = createRequestLogger(request, "/api/health");
  try {
    const { getDb } = await import("../../../db");
    const db = getDb();
    const contractAddress = CREDREP_CONTRACT_ADDRESS.toLowerCase();
    const [profiles, markets] = await Promise.all([
      db
        .select({ value: count() })
        .from(chainProfiles)
        .where(eq(chainProfiles.contractAddress, contractAddress)),
      db.select({ value: count() }).from(sourcedMarkets),
    ]);
    log.done(200);
    return Response.json(
      {
        ok: true,
        database: "available",
        indexedProfiles: profiles[0]?.value ?? 0,
        sourcedMarkets: markets[0]?.value ?? 0,
        contractAddress: CREDREP_CONTRACT_ADDRESS,
        deploymentRegion: process.env.VERCEL_REGION ?? "local",
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    log.failed(error, 503);
    return Response.json(
      { ok: false, database: "unavailable", checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
