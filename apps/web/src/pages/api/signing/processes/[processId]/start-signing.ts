import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const processId = context.params.processId;
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/start-signing`,
    { method: "POST" },
  );
};
