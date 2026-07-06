import { p as proxyApiResponse } from '../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async (context) => {
  const body = await context.request.text();
  return proxyApiResponse(context, "/api/enrollment/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
