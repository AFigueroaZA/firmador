import { p as proxyApiResponse } from '../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../renderers.mjs';

const PATCH = async (context) => {
  const body = await context.request.text();
  return proxyApiResponse(context, "/api/identity/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  PATCH
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
