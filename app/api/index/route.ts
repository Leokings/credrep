import { getChatGPTUser } from "../../chatgpt-auth";
import { indexBradburyWallet } from "../../../lib/chain-indexer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "Sign in before syncing a wallet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { address?: unknown };
    if (typeof body.address !== "string") {
      return Response.json({ error: "A wallet address is required." }, { status: 400 });
    }
    const result = await indexBradburyWallet(body.address);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet sync failed.";
    const status = message.includes("valid EVM wallet") ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
