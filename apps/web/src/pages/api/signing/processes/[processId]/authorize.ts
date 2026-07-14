import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const processId = context.params.processId;
  const search = context.url.search ?? "";
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/authorize${search}`,
    { method: "POST" },
  );
};

