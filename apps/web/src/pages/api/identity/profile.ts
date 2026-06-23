import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../lib/server/api";

export const PATCH: APIRoute = async (context) => {
  const body = await context.request.text();
  return proxyApiResponse(context, "/api/identity/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
};
