import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const PATCH: APIRoute = async (context) => {
  const processId = context.params.processId;
  const body = await context.request.text();
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/sign-options`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
};
