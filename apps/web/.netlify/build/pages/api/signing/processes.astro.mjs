import { p as proxyApiResponse } from '../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async (context) => {
  const formData = await context.request.formData();
  return proxyApiResponse(context, "/api/signing/processes", {
    method: "POST",
    body: formData
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
