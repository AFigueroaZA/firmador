import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  return proxyApiResponse(context, "/api/enrollment/challenge/start", {
    method: "POST",
  });
};
