type LogDetails = Record<string, string | number | boolean | null>;

export function createRequestLogger(request: Request, route: string) {
  const startedAt = Date.now();
  const requestId =
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    "local";

  console.log(
    JSON.stringify({
      level: "info",
      message: "request_started",
      route,
      requestId,
    }),
  );

  return {
    done(status: number, details: LogDetails = {}) {
      console.log(
        JSON.stringify({
          level: "info",
          message: "request_completed",
          route,
          requestId,
          status,
          durationMs: Date.now() - startedAt,
          ...details,
        }),
      );
    },
    failed(error: unknown, status: number, details: LogDetails = {}) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "request_failed",
          route,
          requestId,
          status,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
          ...details,
        }),
      );
    },
  };
}
