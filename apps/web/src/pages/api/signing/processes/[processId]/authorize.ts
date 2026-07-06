import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../../lib/server/api";

export const GET: APIRoute = async (context) => {
  const processId = context.params.processId;
  const search = context.url.search ?? "";
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/authorize${search}`,
  );
};

