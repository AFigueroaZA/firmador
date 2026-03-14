import type { APIRoute } from "astro";
import { apiUrl } from "../../lib/server/api";

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return Response.redirect("/login?error=invalid", 302);
  }

  const headers = new Headers(response.headers);
  headers.set("location", "/dashboard");
  return new Response(null, {
    status: 302,
    headers,
  });
};

