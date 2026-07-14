import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../lib/server/api";

export const GET: APIRoute = (context) =>
  proxyApiResponse(context, "/api/balance");
