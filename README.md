# Firmador

Monorepo `pnpm` para una plataforma web de firma de PDFs con:

- `apps/web`: frontend Astro + Tailwind
- `apps/api`: backend NestJS
- `packages/shared`: contratos y tipos compartidos

## Requisitos

- Node.js 22+
- `pnpm` 10+ (o `npx pnpm@10.6.4`)

## Estructura

- `apps/web`: Astro SSR + Tailwind + una isla React con `pdf.js`
- `apps/api`: NestJS + TypeORM + `sql.js` en desarrollo
- `packages/shared`: contratos, enums y tipos compartidos

## Primer arranque

```bash
npx pnpm@10.6.4 install
npx pnpm@10.6.4 seed
npx pnpm@10.6.4 dev
```

Esto levanta:

- web en `http://localhost:4321`
- api en `http://localhost:3000`

## Credenciales seed

- `admin@firmador.local` / `Admin1234!`
- `operador@firmador.local` / `Operador1234!`

## Variables de entorno

Cada app incluye un archivo `.env.example` con la configuración mínima.

## Pruebas

```bash
npx pnpm@10.6.4 test
```

## Build

```bash
npx pnpm@10.6.4 build
```
