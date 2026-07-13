import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_Da6PhrLs.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/enrollment/challenge/start.astro.mjs');
const _page2 = () => import('./pages/api/enrollment/challenge.astro.mjs');
const _page3 = () => import('./pages/api/enrollment/clave-unica/start.astro.mjs');
const _page4 = () => import('./pages/api/enrollment.astro.mjs');
const _page5 = () => import('./pages/api/identity/clave-unica/authorize.astro.mjs');
const _page6 = () => import('./pages/api/identity/me.astro.mjs');
const _page7 = () => import('./pages/api/identity/profile.astro.mjs');
const _page8 = () => import('./pages/api/registration/_state_/complete.astro.mjs');
const _page9 = () => import('./pages/api/registration/_state_.astro.mjs');
const _page10 = () => import('./pages/api/signing/processes/_processid_/authorize.astro.mjs');
const _page11 = () => import('./pages/api/signing/processes/_processid_/challenge.astro.mjs');
const _page12 = () => import('./pages/api/signing/processes/_processid_/download.astro.mjs');
const _page13 = () => import('./pages/api/signing/processes/_processid_/original.astro.mjs');
const _page14 = () => import('./pages/api/signing/processes/_processid_/payment.astro.mjs');
const _page15 = () => import('./pages/api/signing/processes/_processid_/sign-options.astro.mjs');
const _page16 = () => import('./pages/api/signing/processes/_processid_/start-signing.astro.mjs');
const _page17 = () => import('./pages/api/signing/processes/_processid_.astro.mjs');
const _page18 = () => import('./pages/api/signing/processes.astro.mjs');
const _page19 = () => import('./pages/dashboard.astro.mjs');
const _page20 = () => import('./pages/enrollment/challenge.astro.mjs');
const _page21 = () => import('./pages/history.astro.mjs');
const _page22 = () => import('./pages/identity.astro.mjs');
const _page23 = () => import('./pages/login.astro.mjs');
const _page24 = () => import('./pages/register/complete.astro.mjs');
const _page25 = () => import('./pages/register.astro.mjs');
const _page26 = () => import('./pages/session/login.astro.mjs');
const _page27 = () => import('./pages/session/logout.astro.mjs');
const _page28 = () => import('./pages/sign/new.astro.mjs');
const _page29 = () => import('./pages/sign/_processid_/challenge.astro.mjs');
const _page30 = () => import('./pages/sign/_processid_/payment.astro.mjs');
const _page31 = () => import('./pages/sign/_processid_/progress.astro.mjs');
const _page32 = () => import('./pages/sign/_processid_/result.astro.mjs');
const _page33 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["../../node_modules/.pnpm/astro@5.18.1_@netlify+blobs_912f9c9f24c79c23bbf98e2f54df4421/node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/enrollment/challenge/start.ts", _page1],
    ["src/pages/api/enrollment/challenge/index.ts", _page2],
    ["src/pages/api/enrollment/clave-unica/start.ts", _page3],
    ["src/pages/api/enrollment/index.ts", _page4],
    ["src/pages/api/identity/clave-unica/authorize.ts", _page5],
    ["src/pages/api/identity/me.ts", _page6],
    ["src/pages/api/identity/profile.ts", _page7],
    ["src/pages/api/registration/[state]/complete.ts", _page8],
    ["src/pages/api/registration/[state].ts", _page9],
    ["src/pages/api/signing/processes/[processId]/authorize.ts", _page10],
    ["src/pages/api/signing/processes/[processId]/challenge.ts", _page11],
    ["src/pages/api/signing/processes/[processId]/download.ts", _page12],
    ["src/pages/api/signing/processes/[processId]/original.ts", _page13],
    ["src/pages/api/signing/processes/[processId]/payment.ts", _page14],
    ["src/pages/api/signing/processes/[processId]/sign-options.ts", _page15],
    ["src/pages/api/signing/processes/[processId]/start-signing.ts", _page16],
    ["src/pages/api/signing/processes/[processId]/index.ts", _page17],
    ["src/pages/api/signing/processes/index.ts", _page18],
    ["src/pages/dashboard.astro", _page19],
    ["src/pages/enrollment/challenge.astro", _page20],
    ["src/pages/history.astro", _page21],
    ["src/pages/identity.astro", _page22],
    ["src/pages/login.astro", _page23],
    ["src/pages/register/complete.astro", _page24],
    ["src/pages/register/index.ts", _page25],
    ["src/pages/session/login.ts", _page26],
    ["src/pages/session/logout.ts", _page27],
    ["src/pages/sign/new.astro", _page28],
    ["src/pages/sign/[processId]/challenge.astro", _page29],
    ["src/pages/sign/[processId]/payment.astro", _page30],
    ["src/pages/sign/[processId]/progress.astro", _page31],
    ["src/pages/sign/[processId]/result.astro", _page32],
    ["src/pages/index.astro", _page33]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "5b38dc69-0c09-4e53-bc47-3a4db0530919"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
