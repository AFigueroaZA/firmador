import type { APIRoute } from "astro";
import { apiUrl } from "../../lib/server/api";

export const GET: APIRoute = async ({ url }) => {
  const response = await fetch(apiUrl("/api/registration/clave-unica/authorize"));
  if (!response.ok) {
    return Response.redirect(new URL("/?error=registration", url), 302);
  }

  const authorization = (await response.json()) as { url: string };
  return Response.redirect(authorization.url, 302);
};
