# Firmador

Monorepo `pnpm` para una plataforma web de firma de PDFs con:

- `apps/web`: frontend Astro + Tailwind
- `apps/api`: backend NestJS
- `packages/shared`: contratos y tipos compartidos

## Requisitos

- Node.js 22+
- `pnpm` 10+ instalado globalmente

## Estructura

- `apps/web`: Astro SSR + Tailwind + una isla React con `pdf.js`
- `apps/api`: NestJS + TypeORM + `sql.js` en desarrollo
- `packages/shared`: contratos, enums y tipos compartidos
- `.env`: variables reales para ejecutar localmente desde la raiz
- `.env.example`: plantilla sin secretos

## Primer arranque

```bash
pnpm install
cp .env.example .env
pnpm seed
pnpm dev
```

Esto levanta:

- web en `http://localhost:4321`
- api en `http://localhost:3000`

Antes de ejecutar `pnpm seed` completa los secretos obligatorios en `.env`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `SEED_ADMIN_PASSWORD` y `SEED_OPERATOR_PASSWORD`. El puerto web se toma desde `WEB_BASE_URL` y se inicia en modo estricto. Si `4321` esta ocupado, cierra el proceso que lo usa o cambia `WEB_BASE_URL` y `CORS_ORIGIN` en `.env`.

## Credenciales seed

Las cuentas iniciales se crean solo cuando la base esta vacia y toman sus valores desde `.env`:

- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD`

No dejes contrasenas seed en codigo, README, pantallas o commits. En entornos compartidos, rota estas credenciales despues del primer ingreso.

## Variables de entorno

El monorepo se configura desde `.env` en la raiz. Los scripts raiz cargan ese archivo antes de iniciar API, web, seed, tests y builds. `.env` esta ignorado por Git; `.env.example` documenta las claves necesarias sin valores sensibles.

## Plantillas `.env.example`

El repositorio mantiene dos plantillas para cubrir formas distintas de ejecutar la app:

- [.env.example](.env.example): plantilla principal del monorepo. Usala cuando trabajes desde la raiz con `pnpm dev`, `pnpm seed`, `pnpm test`, `pnpm lint` o `pnpm build`. Es la referencia recomendada para desarrollo local porque los scripts raiz cargan `.env` antes de iniciar API y web.
- [apps/api/.env.example](apps/api/.env.example): plantilla especifica del backend. Sirve como referencia cuando la API se ejecuta, despliega o configura de forma aislada desde `apps/api`, por ejemplo en un servicio dedicado o contenedor backend.

Ambas plantillas deben documentar las mismas variables sensibles sin incluir valores reales. Si agregas, renombras o eliminas una variable de configuracion del backend, actualiza las dos plantillas para evitar que desarrollo local y despliegue queden desalineados.

Para generar secretos locales puedes usar:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Para llamar al proveedor real cambia:

```bash
SIGNING_PROVIDER_MODE=live
```

En modo `live`, ademas de las credenciales base, debes completar `PROVIDER_USERNAME`, `PROVIDER_PASSWORD`, `PROVIDER_CERT_DOWNLOAD_USER`, `PROVIDER_CERT_DOWNLOAD_PASSWORD`, `PROVIDER_RUT_EMPRESA`, `PROVIDER_ORIGIN`, `PROVIDER_PIN_FIRMA` y `DEFAULT_CERTIFICATE_PASSWORD`.

## Pruebas

```bash
pnpm test
```

## Build

```bash
pnpm build
```
