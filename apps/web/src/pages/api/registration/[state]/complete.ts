import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const state = context.params.state;
  const body = await context.request.text();
  return proxyApiResponse(context, `/api/registration/${state}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
};
