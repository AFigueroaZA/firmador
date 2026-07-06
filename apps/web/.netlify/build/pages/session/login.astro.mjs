import { a as apiUrl } from '../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    return Response.redirect(new URL("/login?error=invalid", request.url), 302);
  }
  const headers = new Headers(response.headers);
  let location = "/dashboard";
  try {
    const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    const cookieHeader = setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
    if (cookieHeader) {
      const enrollmentResponse = await fetch(apiUrl("/api/enrollment"), {
        headers: { cookie: cookieHeader }
      });
      if (enrollmentResponse.ok) {
        const enrollment = await enrollmentResponse.json();
        if (enrollment.status !== "ACTIVE") {
          location = "/enrollment/challenge";
        }
      }
    }
  } catch {
  }
  headers.set("location", location);
  return new Response(null, {
    status: 302,
    headers
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
