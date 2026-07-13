/* empty css                                     */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, m as maybeRenderHead, f as addAttribute } from '../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../chunks/AppLayout_CblbXfT2.mjs';
import { $ as $$StatusBadge } from '../chunks/StatusBadge_BRdOb4Zl.mjs';
import { s as serverFetch } from '../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$History = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$History;
  const response = await serverFetch(Astro2.request, "/api/history");
  const history = response.ok ? await response.json() : { items: [] };
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Historial de firmas", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="panel animate-rise overflow-hidden"> <div class="border-b border-slate-100 px-6 py-5"> <h2 class="text-lg font-semibold text-ink">Procesos recientes</h2> <p class="mt-2 text-sm text-slate-500"> ${Astro2.locals.user?.role === "admin" ? "Como admin ves todos los procesos registrados." : "Aqu\xED ver\xE1s solo tus procesos."} </p> </div> <div class="divide-y divide-slate-100"> ${history.items.length === 0 ? renderTemplate`<div class="px-6 py-8 text-sm text-slate-500">Todavía no hay procesos registrados.</div>` : history.items.map((item) => renderTemplate`<article class="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"> <div> <h3 class="font-semibold text-ink">${item.originalFileName}</h3> <p class="mt-2 text-sm text-slate-500">
Creado el ${new Date(item.createdAt).toLocaleString("es-CL")} · Expira el ${new Date(item.expiresAt).toLocaleString("es-CL")} </p> </div> <div class="flex flex-wrap items-center gap-3"> ${renderComponent($$result2, "StatusBadge", $$StatusBadge, { "status": item.status })} <a class="button-secondary"${addAttribute(`/sign/${item.id}/result`, "href")}>Abrir</a> </div> </article>`)} </div> </section> ` })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/history.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/history.astro";
const $$url = "/history";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$History,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
