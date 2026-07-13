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
const $$Challenge = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Challenge;
  const { processId } = Astro2.params;
  const response = await serverFetch(Astro2.request, `/api/signing/processes/${processId}`);
  if (!response.ok) {
    return Astro2.redirect("/history");
  }
  const process = await response.json();
  if (process.status === "SIGNED" || process.status === "FAILED" || process.status === "EXPIRED") {
    return Astro2.redirect(`/sign/${processId}/result`);
  }
  if (process.status !== "CHALLENGE_PENDING") {
    return Astro2.redirect(`/sign/${processId}/progress`);
  }
  const challenge = process.challenge;
  if (!challenge) {
    return Astro2.redirect(`/sign/${processId}/progress`);
  }
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Validaci\xF3n challenge", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<section class="mx-auto max-w-3xl"> <form class="panel animate-rise space-y-5 px-6 py-6" id="challenge-form"> <input name="idChallenge" type="hidden"', '> <div> <h2 class="text-lg font-semibold text-ink">Confirma la identidad del firmante</h2> <p class="mt-2 text-sm text-slate-600">\nResponde las preguntas entregadas por el proveedor para continuar con la emisi\xF3n/configuraci\xF3n del certificado.\n</p> </div> ', ' <div class="hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="challenge-error"></div> <button class="button-primary" type="submit">Enviar respuestas</button> </form> </section> <script', '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const form = document.querySelector("#challenge-form");\n    const errorBox = document.querySelector("#challenge-error");\n    form?.addEventListener("submit", async (event) => {\n      event.preventDefault();\n      errorBox?.classList.add("hidden");\n\n      const idChallenge = form.querySelector(\'input[name="idChallenge"]\').value;\n      const answers = Array.from(form.querySelectorAll("select[data-question]")).map((select) => ({\n        question: Number(select.getAttribute("data-question")),\n        answer: Number(select.value),\n      }));\n\n      const response = await fetch(`/api/signing/processes/${processId}/challenge`, {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ idChallenge, answers }),\n      });\n\n      if (!response.ok) {\n        errorBox.textContent = "No se pudieron enviar las respuestas. Revisa los datos y vuelve a intentar.";\n        errorBox.classList.remove("hidden");\n        return;\n      }\n\n      window.location.assign(`/sign/${processId}/progress`);\n    });\n  <\/script> '], [" ", '<section class="mx-auto max-w-3xl"> <form class="panel animate-rise space-y-5 px-6 py-6" id="challenge-form"> <input name="idChallenge" type="hidden"', '> <div> <h2 class="text-lg font-semibold text-ink">Confirma la identidad del firmante</h2> <p class="mt-2 text-sm text-slate-600">\nResponde las preguntas entregadas por el proveedor para continuar con la emisi\xF3n/configuraci\xF3n del certificado.\n</p> </div> ', ' <div class="hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="challenge-error"></div> <button class="button-primary" type="submit">Enviar respuestas</button> </form> </section> <script', '>\n    const processId = document.currentScript?.getAttribute("data-process-id") ?? "";\n    const form = document.querySelector("#challenge-form");\n    const errorBox = document.querySelector("#challenge-error");\n    form?.addEventListener("submit", async (event) => {\n      event.preventDefault();\n      errorBox?.classList.add("hidden");\n\n      const idChallenge = form.querySelector(\'input[name="idChallenge"]\').value;\n      const answers = Array.from(form.querySelectorAll("select[data-question]")).map((select) => ({\n        question: Number(select.getAttribute("data-question")),\n        answer: Number(select.value),\n      }));\n\n      const response = await fetch(\\`/api/signing/processes/\\${processId}/challenge\\`, {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ idChallenge, answers }),\n      });\n\n      if (!response.ok) {\n        errorBox.textContent = "No se pudieron enviar las respuestas. Revisa los datos y vuelve a intentar.";\n        errorBox.classList.remove("hidden");\n        return;\n      }\n\n      window.location.assign(\\`/sign/\\${processId}/progress\\`);\n    });\n  <\/script> '])), maybeRenderHead(), addAttribute(challenge.idChallenge, "value"), challenge.questions.map((question) => renderTemplate`<label class="block text-sm text-slate-700"> <span class="font-medium">${question.prompt}</span> <select class="field mt-2"${addAttribute(question.id, "data-question")} required> <option value="">Selecciona una opción</option> ${question.options.map((option) => renderTemplate`<option${addAttribute(option.value, "value")}>${option.label}</option>`)} </select> </label>`), addAttribute(processId, "data-process-id")) })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/sign/[processId]/challenge.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/sign/[processId]/challenge.astro";
const $$url = "/sign/[processId]/challenge";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Challenge,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
