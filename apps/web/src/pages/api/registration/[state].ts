import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../lib/server/api";

export const GET: APIRoute = async (context) => {
  const state = context.params.state;
  return proxyApiResponse(context, `/api/registration/${state}`);
};
