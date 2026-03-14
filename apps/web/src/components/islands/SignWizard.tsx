import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface SignWizardProps {
  createEndpoint: string;
}

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 72;

export function SignWizard({ createEndpoint }: SignWizardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        viewport,
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

  const handlePdfChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setPdfFile(event.target.files?.[0] ?? null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!visible || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const pdfX = clickX / scale;
    const pdfY = (canvasRef.current.height - clickY) / scale;

    setX(Math.max(0, Math.round(pdfX)));
    setY(Math.max(0, Math.round(pdfY)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    formData.set("visible", String(visible));
    formData.set("page", String(page));
    formData.set("x", String(x));
    formData.set("y", String(y));
    formData.set("width", String(width));
    formData.set("height", String(height));

    try {
      const createResponse = await fetch(createEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!createResponse.ok) {
        const body = await createResponse.text();
        throw new Error(body || "No se pudo crear el proceso de firma.");
      }

      const created = (await createResponse.json()) as { processId: string };
      const authorizeResponse = await fetch(
        `/api/signing/processes/${created.processId}/authorize`,
      );

      if (!authorizeResponse.ok) {
        const body = await authorizeResponse.text();
        throw new Error(body || "No se pudo iniciar la autorización externa.");
      }

      const authorization = (await authorizeResponse.json()) as { url: string };
      window.location.assign(authorization.url);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ocurrió un error inesperado.",
      );
      setIsSubmitting(false);
    }
  };

  const overlayStyle = visible
    ? {
        left: `${x * scale}px`,
        top: `${viewportHeight - (y + height) * scale}px`,
        width: `${width * scale}px`,
        height: `${height * scale}px`,
      }
    : undefined;

  return (
    <form className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]" onSubmit={handleSubmit}>
      <section className="panel animate-rise space-y-4 px-5 py-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Archivo PDF
          </label>
          <input className="field" type="file" accept="application/pdf" onChange={handlePdfChange} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Imagen de firma (opcional)
          </label>
          <input
            className="field"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          Firma visible
          <input
            checked={visible}
            type="checkbox"
            className="h-4 w-4"
            onChange={(event) => setVisible(event.target.checked)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Página
            <input
              className="field mt-2"
              type="number"
              min={1}
              max={pageCount}
              value={page}
              onChange={(event) => setPage(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Total páginas
            <input className="field mt-2 bg-slate-50" readOnly value={pageCount} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            X
            <input
              className="field mt-2"
              type="number"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Y
            <input
              className="field mt-2"
              type="number"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Ancho
            <input
              className="field mt-2"
              type="number"
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Alto
            <input
              className="field mt-2"
              type="number"
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button className="button-primary w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Preparando firma..." : "Continuar a autorización"}
        </button>
      </section>

      <section className="panel animate-rise px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Previsualización</h3>
            <p className="text-sm text-slate-500">
              Haz clic sobre el PDF para posicionar la firma visible.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            {viewportWidth > 0 ? `${Math.round(viewportWidth)} px` : "Sin documento"}
          </div>
        </div>
        <div className="relative overflow-auto rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <canvas
            className="mx-auto block cursor-crosshair rounded-2xl bg-white shadow-panel"
            onClick={handleCanvasClick}
            ref={canvasRef}
          />
          {visible && viewportHeight > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-accent/70 bg-accent/10"
              style={overlayStyle}
            />
          )}
        </div>
      </section>
    </form>
  );
}

