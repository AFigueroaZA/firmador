/* empty css                                        */
import { d as createComponent, j as renderComponent, r as renderTemplate, g as createAstro, m as maybeRenderHead } from '../../chunks/astro/server_CPEKY1oh.mjs';
import { $ as $$AppLayout } from '../../chunks/AppLayout_CblbXfT2.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useRef, useState, useEffect } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import { s as serverFetch } from '../../chunks/api_CkSRV9t5.mjs';
export { renderers } from '../../renderers.mjs';

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 72;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function SignWizard({ createEndpoint }) {
  const canvasRef = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(true);
  const [x, setX] = useState(90);
  const [y, setY] = useState(120);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [scale, setScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [dragState, setDragState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const pageWidth = viewportWidth > 0 ? viewportWidth / scale : 0;
  const pageHeight = viewportHeight > 0 ? viewportHeight / scale : 0;
  const clampPlacement = (nextX, nextY) => ({
    x: Math.round(clamp(nextX, 0, Math.max(0, pageWidth - width))),
    y: Math.round(clamp(nextY, 0, Math.max(0, pageHeight - height)))
  });
  useEffect(() => {
    if (!pdfFile) {
      setPdfDoc(null);
      return;
    }
    let cancelled = false;
    const loadPdf = async () => {
      const buffer = await pdfFile.arrayBuffer();
      const document = await getDocument({ data: buffer }).promise;
      if (!cancelled) {
        setPdfDoc(document);
        setPageCount(document.numPages);
        setPage(1);
      }
    };
    void loadPdf().catch(() => {
      if (!cancelled) {
        setError("No se pudo leer el PDF seleccionado.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pdfFile]);
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }
    let cancelled = false;
    const render = async () => {
      const pdfPage = await pdfDoc.getPage(page);
      const unscaledViewport = pdfPage.getViewport({ scale: 1 });
      const nextScale = Math.min(1.35, 640 / unscaledViewport.width);
      const viewport = pdfPage.getViewport({ scale: nextScale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) {
        return;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      await pdfPage.render({
        canvasContext: context,
        viewport
      }).promise;
      if (!cancelled) {
        setScale(nextScale);
        setViewportHeight(viewport.height);
        setViewportWidth(viewport.width);
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, page]);
  const handlePdfChange = (event) => {
    setError(null);
    setPdfFile(event.target.files?.[0] ?? null);
  };
  const handleCanvasClick = (event) => {
    if (!visible || !canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const pdfX = clickX / scale - width / 2;
    const pdfY = (canvasRef.current.height - clickY) / scale - height / 2;
    const nextPlacement = clampPlacement(pdfX, pdfY);
    setX(nextPlacement.x);
    setY(nextPlacement.y);
  };
  const handleOverlayPointerDown = (event) => {
    if (!visible) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      baseX: x,
      baseY: y
    });
  };
  const handleOverlayPointerMove = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = (event.clientX - dragState.startClientX) / scale;
    const deltaY = (event.clientY - dragState.startClientY) / scale;
    const nextPlacement = clampPlacement(
      dragState.baseX + deltaX,
      dragState.baseY - deltaY
    );
    setX(nextPlacement.x);
    setY(nextPlacement.y);
  };
  const handleOverlayPointerUp = (event) => {
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragState(null);
    }
  };
  const readError = async (response, fallback) => {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed.message)) {
        return parsed.message.join(" ");
      }
      return parsed.message ?? fallback;
    } catch {
      return body || fallback;
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!pdfFile) {
      setError("Selecciona un PDF para continuar.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("pdf", pdfFile);
    if (imageFile) {
      formData.set("imageFile", imageFile);
    }
    try {
      const createResponse = await fetch(createEndpoint, {
        method: "POST",
        body: formData
      });
      if (!createResponse.ok) {
        throw new Error(
          await readError(createResponse, "No se pudo crear el proceso.")
        );
      }
      const created = await createResponse.json();
      const signOptionsResponse = await fetch(
        `/api/signing/processes/${created.processId}/sign-options`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            visible ? { visible, page, x, y, width, height } : { visible: false }
          )
        }
      );
      if (!signOptionsResponse.ok) {
        throw new Error(
          await readError(
            signOptionsResponse,
            "No se pudo guardar la posicion de firma."
          )
        );
      }
      window.location.assign(`/sign/${created.processId}/payment`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Ocurrio un error inesperado."
      );
      setIsSubmitting(false);
    }
  };
  const overlayStyle = visible ? {
    left: `${x * scale}px`,
    top: `${viewportHeight - (y + height) * scale}px`,
    width: `${width * scale}px`,
    height: `${height * scale}px`
  } : void 0;
  return /* @__PURE__ */ jsxs(
    "form",
    {
      className: "grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]",
      onSubmit: handleSubmit,
      children: [
        /* @__PURE__ */ jsxs("section", { className: "panel animate-rise space-y-4 px-5 py-5", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-2 block text-sm font-semibold text-slate-700", children: "Archivo PDF" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "field",
                type: "file",
                accept: "application/pdf",
                onChange: handlePdfChange
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-2 block text-sm font-semibold text-slate-700", children: "Imagen de firma (opcional)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "field",
                type: "file",
                accept: "image/png,image/jpeg",
                onChange: (event) => setImageFile(event.target.files?.[0] ?? null)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700", children: [
            "Firma visible",
            /* @__PURE__ */ jsx(
              "input",
              {
                checked: visible,
                type: "checkbox",
                className: "h-4 w-4",
                onChange: (event) => setVisible(event.target.checked)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "Pagina",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2",
                  type: "number",
                  min: 1,
                  max: pageCount,
                  value: page,
                  onChange: (event) => setPage(clamp(Number(event.target.value), 1, pageCount))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "Total paginas",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2 bg-slate-50",
                  readOnly: true,
                  value: pageCount
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "X",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2",
                  type: "number",
                  value: x,
                  onChange: (event) => setX(Number(event.target.value))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "Y",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2",
                  type: "number",
                  value: y,
                  onChange: (event) => setY(Number(event.target.value))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "Ancho",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2",
                  type: "number",
                  min: 1,
                  value: width,
                  onChange: (event) => setWidth(Math.max(1, Number(event.target.value)))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "text-sm text-slate-600", children: [
              "Alto",
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field mt-2",
                  type: "number",
                  min: 1,
                  value: height,
                  onChange: (event) => setHeight(Math.max(1, Number(event.target.value)))
                }
              )
            ] })
          ] }),
          error && /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700", children: error }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "button-primary w-full",
              disabled: isSubmitting,
              type: "submit",
              children: isSubmitting ? "Preparando firma..." : "Continuar a pago demo"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "panel animate-rise px-5 py-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-ink", children: "Previsualizacion" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "Haz clic sobre el PDF o arrastra el recuadro de firma." })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600", children: pageWidth > 0 ? `${Math.round(pageWidth)} x ${Math.round(pageHeight)} pt` : "Sin documento" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "overflow-auto rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4", children: /* @__PURE__ */ jsx("div", { className: "mx-auto w-fit", children: /* @__PURE__ */ jsxs("div", { className: "relative inline-block", children: [
            /* @__PURE__ */ jsx(
              "canvas",
              {
                className: "block cursor-crosshair rounded-2xl bg-white shadow-panel",
                onClick: handleCanvasClick,
                ref: canvasRef
              }
            ),
            visible && viewportHeight > 0 && /* @__PURE__ */ jsx(
              "div",
              {
                className: "absolute cursor-move touch-none border-2 border-accent/70 bg-accent/10",
                onPointerDown: handleOverlayPointerDown,
                onPointerMove: handleOverlayPointerMove,
                onPointerUp: handleOverlayPointerUp,
                onPointerCancel: handleOverlayPointerUp,
                style: overlayStyle
              }
            )
          ] }) }) })
        ] })
      ]
    }
  );
}

const $$Astro = createAstro();
const $$New = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$New;
  const identityResponse = await serverFetch(Astro2.request, "/api/identity/me");
  if (!identityResponse.ok) {
    return Astro2.redirect("/login");
  }
  const identity = await identityResponse.json();
  if (!identity.canSign) {
    return Astro2.redirect("/identity?next=/sign/new");
  }
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Nuevo proceso de firma", "user": Astro2.locals.user }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="space-y-4"> <div class="panel animate-rise px-6 py-5"> <h2 class="text-lg font-semibold text-ink">Carga y configuracion</h2> <p class="mt-2 text-sm text-slate-600">
Selecciona el PDF, define si la firma sera visible y confirma la posicion antes del pago demo.
</p> </div> ${renderComponent($$result2, "SignWizard", SignWizard, { "client:load": true, "createEndpoint": "/api/signing/processes", "client:component-hydration": "load", "client:component-path": "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/components/islands/SignWizard", "client:component-export": "SignWizard" })} </section> ` })}`;
}, "C:/Users/afigueroa/Desktop/C\xF3digos/Universidad/firmador/apps/web/src/pages/sign/new.astro", void 0);

const $$file = "C:/Users/afigueroa/Desktop/Códigos/Universidad/firmador/apps/web/src/pages/sign/new.astro";
const $$url = "/sign/new";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$New,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
