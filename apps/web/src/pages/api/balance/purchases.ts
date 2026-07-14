import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const body = await context.request.text();
  return proxyApiResponse(context, "/api/balance/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
};
