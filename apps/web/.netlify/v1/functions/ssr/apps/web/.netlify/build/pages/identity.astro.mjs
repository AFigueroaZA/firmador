/* empty css                                     */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, f as addAttribute, m as maybeRenderHead } from '../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../chunks/AppLayout_CblbXfT2.mjs';
import { s as serverFetch } from '../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Identity = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Identity;
  const response = await serverFetch(Astro2.request, "/api/identity/me");
  if (!response.ok) {
    return Astro2.redirect("/login");
  }
  const identity = await response.json();
  const nextPath = Astro2.url.searchParams.get("next") ?? "/sign/new";
  const error = Astro2.url.searchParams.get("error");
  const profile = identity.profile;
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Identidad y perfil", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<section class="mx-auto max-w-4xl space-y-5"> ', ' <div class="panel animate-rise px-6 py-6"> <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"> <div> <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">\nEstado\n</p> <h2 class="mt-2 text-xl font-semibold text-ink"> ', ' </h2> <p class="mt-2 text-sm text-slate-600">\nPrimero valida tu identidad y completa los datos necesarios para operar documentos.\n</p> </div> <div class="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"> ', " </div> </div> </div> ", " ", " ", ' </section> <script>\n    const form = document.querySelector("#identity-profile-form");\n    const errorBox = document.querySelector("#identity-profile-error");\n    form?.addEventListener("submit", async (event) => {\n      event.preventDefault();\n      errorBox?.classList.add("hidden");\n\n      const formData = new FormData(form);\n      const payload = Object.fromEntries(formData.entries());\n      const response = await fetch("/api/identity/profile", {\n        method: "PATCH",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify(payload),\n      });\n\n      if (!response.ok) {\n        if (errorBox) {\n          let detail = "";\n          try {\n            const body = await response.json();\n            detail = Array.isArray(body.message)\n              ? body.message.join(" ")\n              : (body.message ?? "");\n          } catch {\n            detail = "";\n          }\n          errorBox.textContent = detail || "No se pudo guardar el perfil.";\n          errorBox.classList.remove("hidden");\n        }\n        return;\n      }\n\n      window.location.assign(form.getAttribute("data-next") || "/sign/new");\n    });\n  <\/script> '])), maybeRenderHead(), error && renderTemplate`<div class="panel border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
No se pudo completar la validacion. Intentalo nuevamente.
</div>`, identity.canSign ? "Usuario habilitado para firmar" : "Validacion requerida", identity.status, !identity.isValidated && renderTemplate`<article class="panel animate-rise px-6 py-6"> <h3 class="text-lg font-semibold text-ink">Validacion con ClaveUnica</h3> <p class="mt-2 text-sm text-slate-600">
En modo demo, el proveedor mock devuelve una identidad validada y luego podras completar el perfil.
</p> <div class="mt-5"> <a class="button-primary" href="/api/identity/clave-unica/authorize">
Validar identidad
</a> </div> </article>`, identity.isValidated && !identity.canSign && renderTemplate`<form class="panel animate-rise space-y-5 px-6 py-6"${addAttribute(nextPath, "data-next")} id="identity-profile-form"> <div> <h3 class="text-lg font-semibold text-ink">Completar perfil</h3> <p class="mt-2 text-sm text-slate-600">
Estos datos quedan asociados al usuario validado antes de iniciar procesos de firma.
</p> </div> <div class="grid gap-4 md:grid-cols-2"> <label class="text-sm font-medium text-slate-700">
RUN validado
<input class="field mt-2 bg-slate-50" readonly${addAttribute(profile?.rut ?? "", "value")}> </label> <label class="text-sm font-medium text-slate-700">
Email
<input class="field mt-2 bg-slate-50" readonly${addAttribute(profile?.email ?? "", "value")}> </label> <label class="text-sm font-medium text-slate-700">
Numero de documento (serie de la cedula)
<input class="field mt-2" name="numeroDocumento" pattern="[A-Za-z]?[0-9.\-\s]{6,13}" placeholder="A012345678" required title="Número de documento/serie de tu cédula, ej: A012345678 o 123456789"${addAttribute(profile?.numeroDocumento ?? "", "value")}> </label> <label class="text-sm font-medium text-slate-700">
Fecha de nacimiento
<input class="field mt-2" name="fechaNacimiento" required type="date"${addAttribute(profile?.fechaNacimiento ?? "", "value")}> </label> <label class="text-sm font-medium text-slate-700">
Estado civil
<select class="field mt-2" name="estadoCivil" required> <option value="">Selecciona una opción</option> ${["Soltero", "Casado", "Divorciado", "Viudo", "Separado", "Conviviente Civil"].map((option) => renderTemplate`<option${addAttribute(profile?.estadoCivil === option, "selected")}${addAttribute(option, "value")}>${option}</option>`)} </select> </label> <label class="text-sm font-medium text-slate-700">
Telefono celular
<input class="field mt-2" inputmode="numeric" name="telefono" pattern="9[0-9]{8}" placeholder="912345678" required title="Celular chileno de 9 dígitos, comenzando con 9 (ej: 912345678)"${addAttribute(profile?.telefono ?? "", "value")}> </label> </div> <div class="hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" id="identity-profile-error"></div> <button class="button-primary" type="submit">Guardar perfil</button> </form>`, identity.canSign && renderTemplate`<article class="panel animate-rise px-6 py-6"> <h3 class="text-lg font-semibold text-ink">Perfil listo</h3> <p class="mt-2 text-sm text-slate-600">
La identidad esta validada y el perfil tiene los datos necesarios para firmar documentos.
</p> <dl class="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2"> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">RUN</dt> <dd>${profile?.rut}</dd> </div> <div class="rounded-2xl bg-slate-50 px-4 py-3"> <dt class="font-semibold text-slate-700">Email</dt> <dd>${profile?.email}</dd> </div> </dl> <div class="mt-5"> <a class="button-primary"${addAttribute(nextPath, "href")}>Continuar</a> </div> </article>`) })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/identity.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/identity.astro";
const $$url = "/identity";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Identity,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
