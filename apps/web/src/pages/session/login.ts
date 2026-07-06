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
    return Response.redirect(new URL("/login?error=invalid", request.url), 302);
  }

  const headers = new Headers(response.headers);

  // Send the user to the enrollment challenge if their signature
  // certificate is not active yet; otherwise straight to the dashboard.
  let location = "/dashboard";
  try {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    const cookieHeader = setCookies
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    if (cookieHeader) {
      const enrollmentResponse = await fetch(apiUrl("/api/enrollment"), {
        headers: { cookie: cookieHeader },
      });
      if (enrollmentResponse.ok) {
        const enrollment = (await enrollmentResponse.json()) as {
          status?: string;
        };
        if (enrollment.status !== "ACTIVE") {
          location = "/enrollment/challenge";
        }
      }
    }
  } catch {
    // If the check fails, fall back to the dashboard.
  }

  headers.set("location", location);
  return new Response(null, {
    status: 302,
    headers,
  });
};

