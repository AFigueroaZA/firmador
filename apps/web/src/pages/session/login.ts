import type { APIRoute } from "astro";
import type { AuthSession } from "@firmador/shared";
import { apiUrl } from "../../lib/server/api";
import {
  createSessionCacheCookie,
  getCookieValue,
} from "../../lib/server/session-cache.mjs";

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const response = await fetch(apiUrl(request, "/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return Response.redirect(new URL("/login?error=invalid", request.url), 302);
  }

  const headers = new Headers(response.headers);
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  const session = (await response.json().catch(() => null)) as AuthSession | null;
  const accessToken = getCookieValue(setCookies, "firmador_access");
  if (session?.user && accessToken) {
    const cacheCookie = createSessionCacheCookie(
      session,
      accessToken,
      import.meta.env.PROD,
    );
    if (cacheCookie) {
      headers.append("set-cookie", cacheCookie);
    }
  }

  // Send the user to the enrollment challenge if their signature
  // certificate is not active yet; otherwise straight to the dashboard.
  let location = "/dashboard";
  try {
    const cookieHeader = setCookies
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    if (cookieHeader) {
      const enrollmentResponse = await fetch(
        apiUrl(request, "/api/enrollment"),
        {
          headers: { cookie: cookieHeader },
        },
      );
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
