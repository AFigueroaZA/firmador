/* empty css                                           */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, m as maybeRenderHead, f as addAttribute } from '../../../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../../../chunks/AppLayout_CblbXfT2.mjs';
import { $ as $$StatusBadge } from '../../../chunks/StatusBadge_BRdOb4Zl.mjs';
import { s as serverFetch } from '../../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../../renderers.mjs';

const $$Astro = createAstro();
const $$Result = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Result;
  const { processId } = Astro2.params;
  const response = await serverFetch(Astro2.request, `/api/signing/processes/${processId}`);
  if (!response.ok) {
    return Astro2.redirect("/history");
  }
  const process = await response.json();
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Resultado del proceso", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mx-auto max-w-4xl space-y-4"> <article class="panel animate-rise px-6 py-6"> <div class="flex flex-wrap items-start justify-between gap-4"> <div> <h2 class="text-xl font-semibold text-ink">${process.originalFileName}</h2> <p class="mt-2 text-sm text-slate-600">
Hash SHA-256: <span class="font-mono text-xs">${process.sha256}</span> </p> </div> ${renderComponent($$result2, "StatusBadge", $$StatusBadge, { "status": process.status })} </div> ${process.status === "SIGNED" ? renderTemplate`<div class="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-900">
La firma fue completada. El PDF firmado estará disponible hasta ${new Date(process.expiresAt).toLocaleString("es-CL")}.
</div>` : renderTemplate`<div class="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700"> ${process.errorMessage ?? "El proceso no pudo completarse correctamente."} </div>`} <div class="mt-6 flex flex-wrap gap-3"> ${process.status === "SIGNED" && renderTemplate`<a class="button-primary"${addAttribute(`/api/signing/processes/${processId}/download`, "href")}>
Descargar PDF firmado
</a>`} <a class="button-secondary" href="/sign/new">Firmar otro PDF</a> <a class="button-secondary" href="/history">Volver al historial</a> </div> </article> </section> ` })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/sign/[processId]/result.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/sign/[processId]/result.astro";
const $$url = "/sign/[processId]/result";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Result,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
