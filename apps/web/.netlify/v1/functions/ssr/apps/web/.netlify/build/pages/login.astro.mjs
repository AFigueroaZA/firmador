/* empty css                                     */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, m as maybeRenderHead } from '../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../chunks/AppLayout_CblbXfT2.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  const error = Astro2.url.searchParams.get("error");
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Ingreso al sistema" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mx-auto max-w-md animate-rise"> <div class="panel px-6 py-6"> <p class="text-sm text-slate-500">
Ingresa con una cuenta interna del sistema para iniciar el flujo de firma.
</p> <form action="/session/login" class="mt-6 space-y-4" method="post"> <label class="block text-sm text-slate-600">
Correo
<input class="field mt-2" name="email" type="email" required> </label> <label class="block text-sm text-slate-600">
Contraseña
<input class="field mt-2" name="password" type="password" required> </label> ${error && renderTemplate`<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
Credenciales inválidas o sesión no disponible.
</div>`} <button class="button-primary w-full" type="submit">Entrar</button> </form> <div class="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600"> <p class="font-semibold text-slate-700">Acceso inicial</p> <p class="mt-2">
Las cuentas seed se configuran con variables de entorno y deben ser compartidas por un administrador.
</p> </div> </div> </section> ` })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/login.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
