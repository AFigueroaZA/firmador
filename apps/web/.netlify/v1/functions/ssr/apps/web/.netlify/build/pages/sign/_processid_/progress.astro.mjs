/* empty css                                           */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, f as addAttribute, m as maybeRenderHead } from '../../../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../../../chunks/AppLayout_CblbXfT2.mjs';
export { renderers } from '../../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Progress = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Progress;
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Procesando firma", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<section class="mx-auto max-w-2xl"> <div class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Estamos cerrando el proceso</h2> <p class="mt-3 text-sm text-slate-600">\nEl backend esta preparando el registro de firma y enviando el documento al proveedor. Esta vista se actualizara sola.\n</p> <div class="mt-6 rounded-3xl bg-slate-100 p-4"> <div class="h-3 overflow-hidden rounded-full bg-white"> <div class="h-full w-2/3 animate-pulse rounded-full bg-accent"></div> </div> </div> <p class="mt-4 text-sm text-slate-500" id="status-copy">Consultando estado...</p> </div> </section> <script', '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const statusCopy = document.querySelector("#status-copy");\n    const poll = async () => {\n      const response = await fetch(`/api/signing/processes/${processId}`);\n      if (!response.ok) {\n        window.location.assign("/history");\n        return;\n      }\n\n      const process = await response.json();\n      statusCopy.textContent = `Estado actual: ${process.status}`;\n      if (["SIGNED", "FAILED", "EXPIRED"].includes(process.status)) {\n        window.location.assign(`/sign/${processId}/result`);\n        return;\n      }\n\n      window.setTimeout(poll, 1800);\n    };\n\n    void poll();\n  <\/script> '], [" ", '<section class="mx-auto max-w-2xl"> <div class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Estamos cerrando el proceso</h2> <p class="mt-3 text-sm text-slate-600">\nEl backend esta preparando el registro de firma y enviando el documento al proveedor. Esta vista se actualizara sola.\n</p> <div class="mt-6 rounded-3xl bg-slate-100 p-4"> <div class="h-3 overflow-hidden rounded-full bg-white"> <div class="h-full w-2/3 animate-pulse rounded-full bg-accent"></div> </div> </div> <p class="mt-4 text-sm text-slate-500" id="status-copy">Consultando estado...</p> </div> </section> <script', '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const statusCopy = document.querySelector("#status-copy");\n    const poll = async () => {\n      const response = await fetch(\\`/api/signing/processes/\\${processId}\\`);\n      if (!response.ok) {\n        window.location.assign("/history");\n        return;\n      }\n\n      const process = await response.json();\n      statusCopy.textContent = \\`Estado actual: \\${process.status}\\`;\n      if (["SIGNED", "FAILED", "EXPIRED"].includes(process.status)) {\n        window.location.assign(\\`/sign/\\${processId}/result\\`);\n        return;\n      }\n\n      window.setTimeout(poll, 1800);\n    };\n\n    void poll();\n  <\/script> '])), maybeRenderHead(), addAttribute(Astro2.params.processId, "data-process-id")) })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/sign/[processId]/progress.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/sign/[processId]/progress.astro";
const $$url = "/sign/[processId]/progress";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Progress,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
