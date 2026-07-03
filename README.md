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
- `apps/api`: NestJS + TypeORM sobre Supabase Postgres
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

Antes de ejecutar `pnpm seed` completa los secretos obligatorios en `.env`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `SEED_ADMIN_PASSWORD` y `SEED_OPERATOR_PASSWORD`. El puerto web se toma desde `WEB_BASE_URL` y se inicia en modo estricto. Si `4321` esta ocupado, cierra el proceso que lo usa o cambia `WEB_BASE_URL` y `CORS_ORIGIN` en `.env`.

## Credenciales seed

Las cuentas iniciales se crean solo cuando la base esta vacia y toman sus valores desde `.env`:

- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD`

No dejes contrasenas seed en codigo, README, pantallas o commits. En entornos compartidos, rota estas credenciales despues del primer ingreso.

## Variables de entorno

El monorepo se configura desde `.env` en la raiz. Los scripts raiz cargan ese archivo antes de iniciar API, web, seed, tests y builds. `.env` esta ignorado por Git; `.env.example` documenta las claves necesarias sin valores sensibles.

Referencia de variables:

| Variable | Descripcion |
| --- | --- |
| `API_PORT` | Puerto HTTP en el que escucha la API NestJS. Por defecto `3000`. |
| `API_BASE_URL` | URL base publica de la API. La API la usa para callbacks del proveedor y la web la usa para llamar al backend. |
| `WEB_BASE_URL` | URL base publica de la web. La API la usa para redirigir al usuario al finalizar flujos de identidad o firma. |
| `CORS_ORIGIN` | Origen permitido por CORS para llamadas desde la web. Si no se define, usa `WEB_BASE_URL`. |
| `COOKIE_SECURE` | Define si las cookies de sesion se emiten con flag `Secure`. Usar `true` cuando el sitio corre sobre HTTPS. |
| `ENCRYPTION_KEY` | Clave usada para derivar la llave AES-256-GCM que cifra PDFs y payloads persistidos. Es obligatoria. |
| `SIGNING_PROVIDER_MODE` | Modo del proveedor de firma. `mock` usa respuestas simuladas; `live` llama al proveedor real y exige sus credenciales. |
| `TEMP_FILE_TTL_HOURS` | Horas durante las que un proceso de firma conserva archivos temporales antes de considerarlos expirados. |
| `DATABASE_SYNCHRONIZE` | Activa `synchronize` de TypeORM. En Supabase debe quedar `false`; los cambios de schema van por migraciones explicitas. |
| `DATABASE_URL` | Cadena de conexion Postgres de Supabase. Es obligatoria; no hay fallback SQLite/local. |
| `DATABASE_SCHEMA` | Schema Postgres usado por TypeORM. En este proyecto debe ser `public`. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica del proyecto Supabase. La usa el backend para Supabase Auth. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key de Supabase. La usa el backend para login compatible con Supabase Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key usada solo por el backend para Auth Admin, Storage y bootstrap. Nunca se expone al frontend. |
| `SUPABASE_STORAGE_BUCKET` | Bucket privado de Supabase Storage para PDFs e imagenes. Por defecto `documents`. |
| `PROVIDER_ALLOW_INSECURE_TLS` | Flag para permitir TLS inseguro en integraciones del proveedor cuando sea necesario para ambientes no productivos. Por defecto `false`. |
| `PROVIDER_CLAVE_UNICA_BASE_URL` | URL base de los endpoints REST de Clave Unica del proveedor. |
| `PROVIDER_CHALLENGE_BASE_URL` | URL base de los endpoints REST de validacion por challenge del proveedor. |
| `PROVIDER_RA_URL` | Endpoint SOAP de RA usado para ingresar solicitudes de certificado. |
| `PROVIDER_ESIGNER_URL` | URL base SOAP de eSigner usada para descargar/configurar certificados y firmar documentos. |
| `PROVIDER_ORIGIN` | Codigo de origen enviado al proveedor al crear una solicitud RA. Obligatorio en modo `live`. |
| `PROVIDER_RUT_EMPRESA` | RUT de la empresa enviado al proveedor para operaciones de certificado. Obligatorio en modo `live`. |
| `PROVIDER_USERNAME` | Usuario o identificador de aplicacion del proveedor. Se envia en headers REST y solicitudes SOAP. Obligatorio en modo `live`. |
| `PROVIDER_PASSWORD` | Clave/API key asociada a `PROVIDER_USERNAME`. Obligatoria en modo `live`. |
| `PROVIDER_CERT_DOWNLOAD_USER` | Usuario especifico para descargar y configurar certificados en eSigner. Obligatorio en modo `live`. |
| `PROVIDER_CERT_DOWNLOAD_PASSWORD` | Clave del usuario de descarga/configuracion de certificados. Obligatoria en modo `live`. |
| `PROVIDER_PIN_FIRMA` | PIN de firma enviado al proveedor para configurar y ejecutar la firma. Obligatorio en modo `live`. |
| `PROVIDER_CERT_TYPE` | Tipo de certificado solicitado al proveedor. Por defecto `FEA`. |
| `PROVIDER_QR_ENABLED` | Activa el codigo QR en la configuracion del certificado enviada a eSigner. Por defecto `false`. |
| `PROVIDER_QR_X` | Posicion X del codigo QR cuando `PROVIDER_QR_ENABLED=true`. |
| `PROVIDER_QR_Y` | Posicion Y del codigo QR cuando `PROVIDER_QR_ENABLED=true`. |
| `DEFAULT_CERTIFICATE_PASSWORD` | Contrasena asignada al certificado solicitado/descargado. Obligatoria en modo `live`. |
| `CERTIFICATE_VALIDITY_DAYS` | Vigencia del certificado, en dias, enviada a RA. Por defecto `365`. |
| `SEED_ADMIN_EMAIL` | Email del usuario administrador inicial creado por el seed/bootstrap cuando la base esta vacia. |
| `SEED_ADMIN_PASSWORD` | Contrasena del administrador inicial. Es obligatoria para seed/bootstrap y no debe versionarse con valores reales. |
| `SEED_OPERATOR_EMAIL` | Email del usuario operador inicial creado por el seed/bootstrap cuando la base esta vacia. |
| `SEED_OPERATOR_PASSWORD` | Contrasena del operador inicial. Es obligatoria para seed/bootstrap y no debe versionarse con valores reales. |

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

## Registro publico

La primera vista permite iniciar sesion o comenzar un registro nuevo. El registro valida primero la identidad con ClaveUnica, luego solicita los datos faltantes y una contrasena local. Despues de ese alta, el usuario entra con email y contrasena sin repetir ClaveUnica. Supabase se usa como Postgres mediante `DATABASE_URL`; este flujo no usa Supabase Auth ni variables `NEXT_PUBLIC_SUPABASE_*`.

## Pruebas

```bash
pnpm test
```

## Build

```bash
pnpm build
```
