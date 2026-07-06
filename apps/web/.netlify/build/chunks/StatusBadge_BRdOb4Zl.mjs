import { d as createComponent, m as maybeRenderHead, f as addAttribute, r as renderTemplate, g as createAstro } from './astro/server_CPEKY1oh.mjs';

const $$Astro = createAstro();
const $$StatusBadge = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$StatusBadge;
  const { status } = Astro2.props;
  const tone = status === "SIGNED" ? "bg-emerald-100 text-emerald-800" : status === "FAILED" || status === "EXPIRED" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700";
  return renderTemplate`${maybeRenderHead()}<span${addAttribute(`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`, "class")}> ${status} </span>`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/components/StatusBadge.astro", void 0);

export { $$StatusBadge as $ };
