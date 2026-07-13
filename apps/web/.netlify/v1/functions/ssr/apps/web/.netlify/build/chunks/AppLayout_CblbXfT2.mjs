import { d as createComponent, n as renderHead, r as renderTemplate, p as renderSlot, g as createAstro } from './astro/server_CPEKY1oh.mjs';
/* empty css                             */

const $$Astro = createAstro();
const $$AppLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AppLayout;
  const { title, user = null } = Astro2.props;
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>${renderHead()}</head> <body> <div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8"> <header class="panel animate-rise mb-6 flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"> <div> <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
Firmador
</p> <h1 class="text-2xl font-semibold text-ink">${title}</h1> </div> ${user && renderTemplate`<div class="flex items-center gap-3"> <nav class="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600"> <a class="rounded-full px-3 py-2 hover:bg-slate-100" href="/dashboard">Dashboard</a> <a class="rounded-full px-3 py-2 hover:bg-slate-100" href="/identity">Identidad</a> <a class="rounded-full px-3 py-2 hover:bg-slate-100" href="/sign/new">Firmar PDF</a> <a class="rounded-full px-3 py-2 hover:bg-slate-100" href="/history">Historial</a> </nav> <div class="hidden rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700 sm:block"> <div>${user.fullName}</div> <div class="text-xs uppercase tracking-[0.2em] text-slate-500"> ${user.role} </div> </div> <form action="/session/logout" method="post"> <button class="button-secondary" type="submit">Salir</button> </form> </div>`} </header> <main class="flex-1"> ${renderSlot($$result, $$slots["default"])} </main> </div> </body></html>`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/layouts/AppLayout.astro", void 0);

export { $$AppLayout as $ };
