import type { APIRoute } from "astro";
import { serverFetch } from "../../../../lib/server/api";

export const GET: APIRoute = async (context) => {
  const response = await serverFetch(
    context.request,
    "/api/identity/clave-unica/authorize",
  );
  if (!response.ok) {
    return Response.redirect(new URL("/identity?error=authorize", context.url), 302);
  }

  const authorization = (await response.json()) as { url: string };
  return Response.redirect(authorization.url, 302);
};
