import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, PointerEvent } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface SignWizardProps {
  createEndpoint: string;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  baseX: number;
  baseY: number;
}

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 72;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageWidth = viewportWidth > 0 ? viewportWidth / scale : 0;
  const pageHeight = viewportHeight > 0 ? viewportHeight / scale : 0;

  const clampPlacement = (nextX: number, nextY: number) => ({
    x: Math.round(clamp(nextX, 0, Math.max(0, pageWidth - width))),
    y: Math.round(clamp(nextY, 0, Math.max(0, pageHeight - height))),
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
    const pdfX = clickX / scale - width / 2;
    const pdfY = (canvasRef.current.height - clickY) / scale - height / 2;
    const nextPlacement = clampPlacement(pdfX, pdfY);

    setX(nextPlacement.x);
    setY(nextPlacement.y);
  };

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
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
      baseY: y,
    });
  };

  const handleOverlayPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - dragState.startClientX) / scale;
    const deltaY = (event.clientY - dragState.startClientY) / scale;
    const nextPlacement = clampPlacement(
      dragState.baseX + deltaX,
      dragState.baseY - deltaY,
    );

    setX(nextPlacement.x);
    setY(nextPlacement.y);
  };

  const handleOverlayPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragState(null);
    }
  };

  const readError = async (response: Response, fallback: string) => {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        return parsed.message.join(" ");
      }
      return parsed.message ?? fallback;
    } catch {
      return body || fallback;
    }
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

    try {
      const createResponse = await fetch(createEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!createResponse.ok) {
        throw new Error(
          await readError(createResponse, "No se pudo crear el proceso."),
        );
      }

      const created = (await createResponse.json()) as { processId: string };
      const signOptionsResponse = await fetch(
        `/api/signing/processes/${created.processId}/sign-options`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            visible
              ? { visible, page, x, y, width, height }
              : { visible: false },
          ),
        },
      );

      if (!signOptionsResponse.ok) {
        throw new Error(
          await readError(
            signOptionsResponse,
            "No se pudo guardar la posicion de firma.",
          ),
        );
      }

      const authorizeResponse = await fetch(
        `/api/signing/processes/${created.processId}/authorize`,
      );

      if (!authorizeResponse.ok) {
        throw new Error(
          await readError(
            authorizeResponse,
            "No se pudo iniciar la autorizacion externa.",
          ),
        );
      }

      const authorization = (await authorizeResponse.json()) as { url: string };
      window.location.assign(authorization.url);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ocurrio un error inesperado.",
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
    <form
      className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]"
      onSubmit={handleSubmit}
    >
      <section className="panel animate-rise space-y-4 px-5 py-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Archivo PDF
          </label>
          <input
            className="field"
            type="file"
            accept="application/pdf"
            onChange={handlePdfChange}
          />
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
            Pagina
            <input
              className="field mt-2"
              type="number"
              min={1}
              max={pageCount}
              value={page}
              onChange={(event) =>
                setPage(clamp(Number(event.target.value), 1, pageCount))
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            Total paginas
            <input
              className="field mt-2 bg-slate-50"
              readOnly
              value={pageCount}
            />
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
              min={1}
              value={width}
              onChange={(event) =>
                setWidth(Math.max(1, Number(event.target.value)))
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            Alto
            <input
              className="field mt-2"
              type="number"
              min={1}
              value={height}
              onChange={(event) =>
                setHeight(Math.max(1, Number(event.target.value)))
              }
            />
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          className="button-primary w-full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Preparando firma..." : "Continuar a autorizacion"}
        </button>
      </section>

      <section className="panel animate-rise px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Previsualizacion</h3>
            <p className="text-sm text-slate-500">
              Haz clic sobre el PDF o arrastra el recuadro de firma.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            {pageWidth > 0
              ? `${Math.round(pageWidth)} x ${Math.round(pageHeight)} pt`
              : "Sin documento"}
          </div>
        </div>
        <div className="overflow-auto rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="mx-auto w-fit">
            <div className="relative inline-block">
              <canvas
                className="block cursor-crosshair rounded-2xl bg-white shadow-panel"
                onClick={handleCanvasClick}
                ref={canvasRef}
              />
              {visible && viewportHeight > 0 && (
                <div
                  className="absolute cursor-move touch-none border-2 border-accent/70 bg-accent/10"
                  onPointerDown={handleOverlayPointerDown}
                  onPointerMove={handleOverlayPointerMove}
                  onPointerUp={handleOverlayPointerUp}
                  onPointerCancel={handleOverlayPointerUp}
                  style={overlayStyle}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
