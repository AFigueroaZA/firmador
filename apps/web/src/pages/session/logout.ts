import type { APIRoute } from "astro";
import { apiUrl } from "../../lib/server/api";

const logout = async (request: Request) => {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const response = await fetch(apiUrl(request, "/api/auth/logout"), {
    method: "POST",
    headers,
  });

  const nextHeaders = new Headers(response.headers);
  nextHeaders.set("location", "/login");
  return new Response(null, {
    status: 302,
    headers: nextHeaders,
  });
};

export const POST: APIRoute = async ({ request }) => logout(request);
export const GET: APIRoute = async ({ request }) => logout(request);
