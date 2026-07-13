/* empty css                                     */
import { d as createComponent, m as maybeRenderHead, r as renderTemplate, g as createAstro, j as renderComponent } from '../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../chunks/AppLayout_CblbXfT2.mjs';
import { s as serverFetch } from '../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro();
const $$InfoCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$InfoCard;
  const { title, value, subtitle } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<article class="panel animate-rise px-5 py-5"> <p class="text-sm text-slate-500">${title}</p> <p class="mt-3 text-3xl font-semibold text-ink">${value}</p> <p class="mt-2 text-sm text-slate-500">${subtitle}</p> </article>`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/components/InfoCard.astro", void 0);

const $$Astro = createAstro();
const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Dashboard;
  const historyResponse = await serverFetch(Astro2.request, "/api/history");
  const identityResponse = await serverFetch(Astro2.request, "/api/identity/me");
  const history = historyResponse.ok ? await historyResponse.json() : { items: [] };
  const identity = identityResponse.ok ? await identityResponse.json() : null;
  const total = history.items.length;
  const signed = history.items.filter((item) => item.status === "SIGNED").length;
  const pending = history.items.filter(
    (item) => [
      "CONFIGURED",
      "EXTERNAL_AUTH_PENDING",
      "CHALLENGE_PENDING",
      "RA_PENDING",
      "CERT_PENDING",
      "SIGNING"
    ].includes(item.status)
  ).length;
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Dashboard operativo", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="grid gap-4 lg:grid-cols-3"> ${renderComponent($$result2, "InfoCard", $$InfoCard, { "title": "Procesos totales", "value": String(total), "subtitle": "Historial del usuario o del entorno admin" })} ${renderComponent($$result2, "InfoCard", $$InfoCard, { "title": "Firmas exitosas", "value": String(signed), "subtitle": "Documentos listos para descarga" })} ${renderComponent($$result2, "InfoCard", $$InfoCard, { "title": "En curso", "value": String(pending), "subtitle": "Procesos esperando interaccion o proveedor" })} </section> <section class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]"> <article class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink"> ${identity?.canSign ? "Flujo principal" : "Habilitacion requerida"} </h2> <ol class="mt-4 space-y-3 text-sm text-slate-600"> <li>1. Valida identidad y completa perfil.</li> <li>2. Carga un PDF y configura la firma visible.</li> <li>3. Confirma el pago demo o saldo disponible.</li> <li>4. Descarga el PDF firmado desde el resultado.</li> </ol> <div class="mt-6 flex flex-wrap gap-3"> ${identity?.canSign ? renderTemplate`<a class="button-primary" href="/sign/new">Firmar un PDF</a>` : renderTemplate`<a class="button-primary" href="/identity?next=/sign/new">Validar identidad</a>`} <a class="button-secondary" href="/history">Ver historial</a> </div> </article> <aside class="panel animate-rise px-6 py-6"> <h2 class="text-lg font-semibold text-ink">Trazabilidad</h2> <p class="mt-3 text-sm text-slate-600">
El sistema guarda estados, errores y metadatos, y el almacenamiento queda encapsulado para migrarlo despues.
</p> </aside> </section> ` })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/dashboard.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
