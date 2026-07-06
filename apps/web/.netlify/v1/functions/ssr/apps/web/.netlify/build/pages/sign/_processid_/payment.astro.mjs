/* empty css                                           */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, f as addAttribute, m as maybeRenderHead } from '../../../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../../../chunks/AppLayout_CblbXfT2.mjs';
import { s as serverFetch } from '../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Payment = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Payment;
  const { processId } = Astro2.params;
  const processResponse = await serverFetch(
    Astro2.request,
    `/api/signing/processes/${processId}`
  );
  if (!processResponse.ok) {
    return Astro2.redirect("/history");
  }
  const process = await processResponse.json();
  if (process.status === "SIGNED" || process.status === "FAILED" || process.status === "EXPIRED") {
    return Astro2.redirect(`/sign/${processId}/result`);
  }
  if (process.status !== "CONFIGURED") {
    return Astro2.redirect(`/sign/${processId}/progress`);
  }
  const paymentResponse = await serverFetch(
    Astro2.request,
    `/api/signing/processes/${processId}/payment`
  );
  const payment = paymentResponse.ok ? await paymentResponse.json() : null;
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Confirmar firma", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<section class="mx-auto max-w-3xl space-y-5"> <article class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Confirmar firma</h2> <p class="mt-2 text-sm text-slate-600"> ', ' </p> <dl class="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2"> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">Documento</dt> <dd>', '</dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">', "</dt> <dd>", '</dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">', "</dt> <dd> ", ' </dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">Estado</dt> <dd>', "</dd> </div> </dl> ", " ", ' <div class="mt-6 flex flex-wrap gap-3"> <button class="button-primary"', ' id="start-signing-button" type="button"> ', ' </button> <a class="button-secondary" href="/sign/new">Elegir otro PDF</a> </div> <div class="mt-4 hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="start-signing-error"></div> </article> </section> <script', "", '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const mode = document.currentScript?.getAttribute("data-mode") ?? "mock";\n    const button = document.querySelector("#start-signing-button");\n    const errorBox = document.querySelector("#start-signing-error");\n\n    button?.addEventListener("click", async () => {\n      button.setAttribute("disabled", "true");\n      errorBox?.classList.add("hidden");\n\n      const response = mode === "live"\n        ? await fetch(`/api/signing/processes/${processId}/authorize`)\n        : await fetch(`/api/signing/processes/${processId}/start-signing`, {\n            method: "POST",\n          });\n\n      if (!response.ok) {\n        button.removeAttribute("disabled");\n        if (errorBox) {\n          errorBox.textContent = "No se pudo iniciar la firma. Revisa el estado del proceso.";\n          errorBox.classList.remove("hidden");\n        }\n        return;\n      }\n\n      if (mode === "live") {\n        const result = await response.json();\n        if (typeof result.url === "string" && result.url) {\n          window.location.assign(result.url);\n          return;\n        }\n        button.removeAttribute("disabled");\n        if (errorBox) {\n          errorBox.textContent = "El proveedor no devolvio una URL de autorizacion.";\n          errorBox.classList.remove("hidden");\n        }\n        return;\n      }\n\n      window.location.assign(`/sign/${processId}/progress`);\n    });\n  <\/script> '], [" ", '<section class="mx-auto max-w-3xl space-y-5"> <article class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Confirmar firma</h2> <p class="mt-2 text-sm text-slate-600"> ', ' </p> <dl class="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2"> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">Documento</dt> <dd>', '</dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">', "</dt> <dd>", '</dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">', "</dt> <dd> ", ' </dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">Estado</dt> <dd>', "</dd> </div> </dl> ", " ", ' <div class="mt-6 flex flex-wrap gap-3"> <button class="button-primary"', ' id="start-signing-button" type="button"> ', ' </button> <a class="button-secondary" href="/sign/new">Elegir otro PDF</a> </div> <div class="mt-4 hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="start-signing-error"></div> </article> </section> <script', "", '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const mode = document.currentScript?.getAttribute("data-mode") ?? "mock";\n    const button = document.querySelector("#start-signing-button");\n    const errorBox = document.querySelector("#start-signing-error");\n\n    button?.addEventListener("click", async () => {\n      button.setAttribute("disabled", "true");\n      errorBox?.classList.add("hidden");\n\n      const response = mode === "live"\n        ? await fetch(\\`/api/signing/processes/\\${processId}/authorize\\`)\n        : await fetch(\\`/api/signing/processes/\\${processId}/start-signing\\`, {\n            method: "POST",\n          });\n\n      if (!response.ok) {\n        button.removeAttribute("disabled");\n        if (errorBox) {\n          errorBox.textContent = "No se pudo iniciar la firma. Revisa el estado del proceso.";\n          errorBox.classList.remove("hidden");\n        }\n        return;\n      }\n\n      if (mode === "live") {\n        const result = await response.json();\n        if (typeof result.url === "string" && result.url) {\n          window.location.assign(result.url);\n          return;\n        }\n        button.removeAttribute("disabled");\n        if (errorBox) {\n          errorBox.textContent = "El proveedor no devolvio una URL de autorizacion.";\n          errorBox.classList.remove("hidden");\n        }\n        return;\n      }\n\n      window.location.assign(\\`/sign/\\${processId}/progress\\`);\n    });\n  <\/script> '])), maybeRenderHead(), payment?.mode === "live" ? "Revisa el documento antes de iniciar la autorizacion externa con el proveedor de firma." : "Este paso representa la validacion de saldo antes de firmar el PDF en modo demo.", process.originalFileName, payment?.mode === "live" ? "Modo" : "Costo", payment?.mode === "live" ? "Proveedor externo" : `${payment?.costCredits ?? 1} credito demo`, payment?.mode === "live" ? "Autorizacion" : "Saldo disponible", payment?.mode === "live" ? payment?.requiresExternalAuthorization ? "Requerida" : "No requerida (certificado vigente)" : payment?.availableCredits ?? 0, payment?.eligible ? "Disponible" : "No disponible", !payment?.eligible && renderTemplate`<div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"> ${payment?.message ?? "No se pudo validar el saldo demo."} </div>`, payment?.eligible && payment?.mode === "live" && !payment?.requiresExternalAuthorization && renderTemplate`<div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
Ya cuentas con un certificado vigente: el documento se firmara directamente, sin repetir la validacion con Clave Unica.
</div>`, addAttribute(!payment?.eligible, "disabled"), payment?.mode === "live" ? payment?.requiresExternalAuthorization ? "Autorizar firma" : "Firmar documento" : "Firmar documento", addAttribute(payment?.mode ?? "mock", "data-mode"), addAttribute(processId, "data-process-id")) })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/sign/[processId]/payment.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/sign/[processId]/payment.astro";
const $$url = "/sign/[processId]/payment";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Payment,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
