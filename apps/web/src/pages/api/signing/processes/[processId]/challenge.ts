import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const processId = context.params.processId;
  const body = await context.request.text();
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/challenge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
};

