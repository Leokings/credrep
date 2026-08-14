import { eq } from "drizzle-orm";
import type { getDb } from ".";
import { profiles } from "./schema";

type Database = ReturnType<typeof getDb>;

export async function ensureProfile(
  db: Database,
  user: { userId: string; displayName: string; email: string },
) {
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const base = user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  const handle = `@${(base || "forecaster").slice(0, 20)}_${user.userId.slice(-4)}`;
  const [created] = await db
    .insert(profiles)
    .values({
      userId: user.userId,
      displayName: user.displayName,
      handle,
    })
    .returning();
  return created;
}
