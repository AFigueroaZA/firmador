import { s as serverFetch } from '../../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../../renderers.mjs';

const GET = async (context) => {
  const response = await serverFetch(
    context.request,
    "/api/identity/clave-unica/authorize"
  );
  if (!response.ok) {
    return Response.redirect(new URL("/identity?error=authorize", context.url), 302);
  }
  const authorization = await response.json();
  return Response.redirect(authorization.url, 302);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
