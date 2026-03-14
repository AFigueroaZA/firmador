import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const GET: APIRoute = async (context) => {
  const processId = context.params.processId;
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/download`,
  );
};
