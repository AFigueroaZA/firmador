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
pnpm seed
pnpm dev
```

Esto levanta:

- web en `http://localhost:4321`
- api en `http://localhost:3000`

El puerto web se toma desde `WEB_BASE_URL` y se inicia en modo estricto. Si `4321` esta ocupado, cierra el proceso que lo usa o cambia `WEB_BASE_URL` y `CORS_ORIGIN` en `.env`.

## Credenciales seed

- `admin@firmador.local` / `Admin1234!`
- `operador@firmador.local` / `Operador1234!`

## Variables de entorno

El monorepo se configura desde `.env` en la raiz. Los scripts raiz cargan ese archivo antes de iniciar API, web, seed, tests y builds.

Para llamar al proveedor real cambia:

```bash
SIGNING_PROVIDER_MODE=live
```

La plantilla `.env.example` incluye los mismos campos sin secretos.

## Pruebas

```bash
pnpm test
```

## Build

```bash
pnpm build
```
