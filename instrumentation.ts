// Next.js calls onRequestError for every uncaught error while rendering a page, a route handler or a server
// action. We log it (grouped) and email the admins once per problem – see app/lib/errors.
export async function register() {}

type ErrorContext = { routerKind?: string; routePath?: string; routeType?: string };
export async function onRequestError(err: unknown, request: { path?: string; method?: string }, context: ErrorContext) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Pages that are deliberately "not found" or redirect throw special errors – those aren't bugs.
  const e = err as { message?: string; stack?: string; digest?: string };
  if (typeof e?.digest === "string" && /^(NEXT_NOT_FOUND|NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(e.digest)) return;
  try {
    const { reportError } = await import("./app/lib/errors/report.server");
    await reportError({ source: "server", message: e?.message ?? String(err), stack: e?.stack, path: request?.path ?? context?.routePath, method: request?.method, digest: e?.digest });
  } catch { /* never let reporting break the response */ }
}
