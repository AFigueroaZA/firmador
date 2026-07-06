import { p as proxyApiResponse } from '../../../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../../../renderers.mjs';

const POST = async (context) => {
  const processId = context.params.processId;
  return proxyApiResponse(
    context,
    `/api/signing/processes/${processId}/start-signing`,
    { method: "POST" }
  );
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
