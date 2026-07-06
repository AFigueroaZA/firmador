import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../lib/server/api";

export const GET: APIRoute = async (context) => {
  return proxyApiResponse(context, "/api/enrollment");
};
