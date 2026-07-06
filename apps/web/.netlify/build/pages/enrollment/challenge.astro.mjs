/* empty css                                        */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, f as addAttribute, m as maybeRenderHead } from '../../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../../chunks/AppLayout_CblbXfT2.mjs';
import { s as serverFetch } from '../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Challenge = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Challenge;
  const nextParam = Astro2.url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";
  const statusResponse = await serverFetch(Astro2.request, "/api/enrollment");
  const enrollment = statusResponse.ok ? await statusResponse.json() : null;
  if (enrollment?.status === "ACTIVE") {
    return Astro2.redirect(next);
  }
  const challenge = enrollment?.challenge ?? null;
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Habilitar firma electr\xF3nica", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<section class="mx-auto max-w-3xl space-y-5"> <article class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Habilita tu firma electr\xF3nica</h2> <p class="mt-2 text-sm text-slate-600">\nPara emitir tu certificado de firma (vigencia 1 a\xF1o), el proveedor necesita que respondas\n        estas preguntas de verificaci\xF3n. Solo se hace una vez: despu\xE9s podr\xE1s firmar tus documentos\n        directamente, sin repetir la validaci\xF3n con Clave \xDAnica.\n</p> </article> ', " </section> <script", `>
    const next = document.currentScript?.getAttribute("data-next") || "/dashboard";
    const form = document.querySelector("#enrollment-challenge-form");
    const errorBox = document.querySelector("#enrollment-challenge-error");
    const regenerateButton = document.querySelector("#regenerate-challenge-button");

    const startButton = document.querySelector("#start-challenge-button");
    const startErrorBox = document.querySelector("#start-challenge-error");

    const providerErrorMessage = async (response) => {
      try {
        const body = await response.json();
        return Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? "");
      } catch {
        return "";
      }
    };

    const startChallenge = async (button, box) => {
      button.setAttribute("disabled", "true");
      const response = await fetch("/api/enrollment/challenge/start", { method: "POST" });
      if (response.ok) {
        window.location.reload();
        return;
      }
      button.removeAttribute("disabled");
      if (box) {
        const detail = await providerErrorMessage(response);
        box.textContent = detail || "No se pudieron generar las preguntas. Intenta de nuevo en unos minutos.";
        box.classList.remove("hidden");
      }
    };

    startButton?.addEventListener("click", () => startChallenge(startButton, startErrorBox));
    regenerateButton?.addEventListener("click", () => startChallenge(regenerateButton, errorBox));

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBox?.classList.add("hidden");

      const idChallenge = form.querySelector('input[name="idChallenge"]').value;
      const answers = Array.from(form.querySelectorAll("select[data-question]")).map((select) => ({
        question: Number(select.getAttribute("data-question")),
        answer: Number(select.value),
      }));

      const response = await fetch("/api/enrollment/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idChallenge, answers }),
      });

      if (!response.ok) {
        if (errorBox) {
          errorBox.textContent =
            "No se pudo completar la validaci\xF3n. Verifica tus respuestas o vuelve a intentarlo con nuevas preguntas recargando la p\xE1gina.";
          errorBox.classList.remove("hidden");
        }
        return;
      }

      window.location.assign(next);
    });
  <\/script> `])), maybeRenderHead(), challenge ? renderTemplate`<form class="panel animate-rise space-y-5 px-6 py-6" id="enrollment-challenge-form"> <input name="idChallenge" type="hidden"${addAttribute(challenge.idChallenge, "value")}> ${challenge.questions.map((question) => renderTemplate`<label class="block text-sm text-slate-700"> <span class="font-medium">${question.prompt}</span> <select class="field mt-2"${addAttribute(question.id, "data-question")} required> <option value="">Selecciona una opción</option> ${question.options.map((option) => renderTemplate`<option${addAttribute(option.value, "value")}>${option.label}</option>`)} </select> </label>`)} <div class="hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="enrollment-challenge-error"></div> <div class="flex flex-wrap gap-3"> <button class="button-primary" type="submit">Enviar respuestas</button> <button class="button-secondary" id="regenerate-challenge-button" type="button">Generar nuevas preguntas</button> <a class="button-secondary" href="/dashboard">Omitir por ahora</a> </div> </form>` : renderTemplate`<article class="panel animate-rise px-6 py-6"> <p class="text-sm text-slate-600">
Aún no tienes preguntas de verificación generadas. El proveedor limita la cantidad de
          intentos por RUT, así que genera las preguntas solo cuando estés listo para responderlas.
</p> <div class="hidden mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="start-challenge-error"></div> <div class="mt-5 flex flex-wrap gap-3"> <button class="button-primary" id="start-challenge-button" type="button">Comenzar validación</button> <a class="button-secondary" href="/identity">Revisar mis datos</a> <a class="button-secondary" href="/dashboard">Omitir por ahora</a> </div> </article>`, addAttribute(next, "data-next")) })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/enrollment/challenge.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/enrollment/challenge.astro";
const $$url = "/enrollment/challenge";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Challenge,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
