import type { APIRoute } from "astro";
import { proxyApiResponse } from "../../../../lib/server/api";

export const POST: APIRoute = async (context) => {
  // Forward the multipart body verbatim (raw bytes + original boundary).
  // Re-parsing with request.formData() and re-serializing can drop file
  // parts in serverless runtimes.
  const body = await context.request.arrayBuffer();
  return proxyApiResponse(context, "/api/signing/processes", {
    method: "POST",
    body,
    headers: {
      "content-type": context.request.headers.get("content-type") ?? "",
    },
  });
};
