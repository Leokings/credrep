export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Fall back to Vercel's deployment metadata below.
    }
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`);
  return new URL("http://localhost:3000");
}
