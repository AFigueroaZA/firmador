# Corrección de apariencias PDF - Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conservar íntegramente las páginas del documento y asegurar que la firma manual y la apariencia dinámica del proveedor sean visibles en el PDF firmado.

**Architecture:** Extraer la preparación binaria del PDF a una función pura y probada. La función dibujará la firma manual sobre la página original elegida, sin reconstruirla, y agregará una página final dedicada cuya zona útil completa se entregará al proveedor para su apariencia dinámica.

**Tech Stack:** TypeScript, NestJS, Jest, pdf-lib.

## Global Constraints

- El PDF enviado al proveedor debe contener la imagen manual antes de la firma criptográfica.
- Ninguna página original puede cambiar de tamaño ni perder anotaciones.
- La apariencia del proveedor debe usar dimensiones derivadas de la página, no una franja de altura fija.
- La preparación debe funcionar igual en los tres flujos: demo, autorización nueva y certificado ya inscrito.

---

### Task 1: Preparador PDF aislado

**Files:**
- Create: `apps/api/src/signing/pdf-signing-preparation.ts`
- Create: `apps/api/src/signing/pdf-signing-preparation.spec.ts`

**Interfaces:**
- Consumes: `originalPdf: Buffer`, `imageBuffer: Buffer | null`, `signOptions: SignOptions`.
- Produces: `preparePdfForSigning(input): Promise<{ pdfBuffer: Buffer; signOptions: SignOptions }>`.

- [x] **Step 1: Escribir las pruebas fallidas**

Crear fixtures con `PDFDocument`: un PDF con anotación en la última página y una imagen PNG. Verificar que las páginas originales conservan tamaño y anotaciones, que la imagen queda como recurso de la página seleccionada y que la página agregada recibe un rectángulo de proveedor derivado de sus dimensiones.

- [x] **Step 2: Ejecutar las pruebas y verificar RED**

Run: `pnpm --filter @firmador/api test -- pdf-signing-preparation.spec.ts`

Expected: FAIL porque `pdf-signing-preparation.ts` aún no existe.

- [x] **Step 3: Implementar la preparación mínima**

Implementar `preparePdfForSigning`: cargar el PDF, validar las coordenadas, incrustar PNG/JPEG directamente en la página elegida, agregar una página del mismo tamaño que la última y calcular márgenes/área útil desde ancho y alto de página.

- [x] **Step 4: Ejecutar las pruebas y verificar GREEN**

Run: `pnpm --filter @firmador/api test -- pdf-signing-preparation.spec.ts`

Expected: PASS.

### Task 2: Integración en SigningService

**Files:**
- Modify: `apps/api/src/signing/signing.service.ts`

**Interfaces:**
- Consumes: `preparePdfForSigning` de Task 1 y archivos leídos mediante `DocumentStorageService`.
- Produces: el mismo retorno privado `{ pdfBuffer, signOptions }` usado por los tres flujos de firma.

- [x] **Step 1: Reemplazar la reconstrucción de última página**

Mantener `prepareDocumentForSigning` como adaptador de almacenamiento y delegar la transformación binaria a `preparePdfForSigning`.

- [x] **Step 2: Ejecutar pruebas focalizadas y suite**

Run: `pnpm --filter @firmador/api test -- pdf-signing-preparation.spec.ts sign-options.spec.ts document-exchange.client.spec.ts`

Expected: PASS.

- [x] **Step 3: Ejecutar validación completa**

Run: `pnpm --filter @firmador/api test`

Run: `pnpm build`

Expected: ambos comandos terminan con código 0.

### Task 3: Verificación visual

**Files:**
- Create temporarily: `tmp/pdfs/pdf-signing-preparation-*.pdf`

**Interfaces:**
- Consumes: PDF fixture preparado por la misma función de producción.
- Produces: PNGs renderizados para inspección local, sin artefactos temporales versionados.

- [x] **Step 1: Renderizar el fixture**

Run: `pdftoppm -png tmp/pdfs/pdf-signing-preparation-output.pdf tmp/pdfs/pdf-signing-preparation`

Expected: una imagen por página, incluida la página final del proveedor.

- [x] **Step 2: Revisar visualmente**

Confirmar que el código/anotación original y la firma manual son legibles, que no hay recorte o solapamiento y que la página del proveedor dispone de un área amplia.
