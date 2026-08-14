import { count } from "drizzle-orm";
import { chainProfiles, sourcedMarkets } from "../../../db/schema";
import { CREDENCE_CONTRACT_ADDRESS } from "../../../lib/deployment";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getDb } = await import("../../../db");
    const db = getDb();
    const [profiles, markets] = await Promise.all([
      db.select({ value: count() }).from(chainProfiles),
      db.select({ value: count() }).from(sourcedMarkets),
    ]);
    return Response.json({
      ok: true,
      database: "available",
      indexedProfiles: profiles[0]?.value ?? 0,
      sourcedMarkets: markets[0]?.value ?? 0,
      contractAddress: CREDENCE_CONTRACT_ADDRESS,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("health_check_failed", error);
    return Response.json(
      { ok: false, database: "unavailable", checkedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}
