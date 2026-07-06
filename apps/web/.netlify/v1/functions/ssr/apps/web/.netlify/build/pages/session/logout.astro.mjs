import { a as apiUrl } from '../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../renderers.mjs';

const logout = async (request) => {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const response = await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers
  });
  const nextHeaders = new Headers(response.headers);
  nextHeaders.set("location", "/login");
  return new Response(null, {
    status: 302,
    headers: nextHeaders
  });
};
const POST = async ({ request }) => logout(request);
const GET = async ({ request }) => logout(request);

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
