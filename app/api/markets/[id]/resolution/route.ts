import { fetchPolymarketResolutionReadiness } from "../../../../../lib/polymarket";
import { createRequestLogger } from "../../../../../lib/server-logging";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = createRequestLogger(request, "/api/markets/[id]/resolution");
  const { id } = await params;
  if (!/^\d{1,32}$/.test(id)) {
    log.done(400, { validMarketId: false });
    return Response.json(
      { error: "A numeric Polymarket market ID is required." },
      { status: 400 },
    );
  }

  try {
    const readiness = await fetchPolymarketResolutionReadiness(id);
    log.done(200, {
      marketId: id,
      resolvable: readiness.resolvable,
      reason: readiness.reason,
    });
    return Response.json(readiness, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    log.failed(error, 502, { marketId: id });
    return Response.json(
      { error: "Polymarket status is temporarily unavailable." },
      { status: 502 },
    );
  }
}
