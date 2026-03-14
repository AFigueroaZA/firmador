import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  return proxyApiResponse(context, "/api/signing/processes", {
    method: "POST",
    body: formData,
  });
};

