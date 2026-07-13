import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDict, PDFDocument, PDFName, PDFStream, rgb } from 'pdf-lib';
import { preparePdfForSigning } from './pdf-signing-preparation';

const SIGNATURE_IMAGE_PATH = resolve(
  __dirname,
  '../../../../resources/firmaliza.png',
);

describe('preparePdfForSigning', () => {
  it('preserves original pages while adding a compact horizontal provider page', async () => {
    const original = await PDFDocument.create();
    const originalPage = original.addPage([320, 480]);
    originalPage.drawText('Documento con codigo de barras', { x: 24, y: 440 });
    for (let x = 24; x < 150; x += 6) {
      originalPage.drawRectangle({
        x,
        y: 24,
        width: x % 12 === 0 ? 4 : 2,
        height: 48,
        color: rgb(0, 0, 0),
      });
    }

    const annotation = original.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [20, 20, 160, 80],
      Border: [0, 0, 0],
    });
    originalPage.node.addAnnot(original.context.register(annotation));

    const result = await preparePdfForSigning({
      originalPdf: Buffer.from(await original.save()),
      imageBuffer: await readFile(SIGNATURE_IMAGE_PATH),
      signOptions: {
        visible: true,
        page: 1,
        x: 180,
        y: 350,
        width: 100,
        height: 60,
      },
    });

    const prepared = await PDFDocument.load(result.pdfBuffer);
    expect(prepared.getPageCount()).toBe(2);
    expect(prepared.getPage(0).getSize()).toEqual({ width: 320, height: 480 });
    expect(prepared.getPage(0).node.Annots()?.size()).toBe(1);

    const resources = prepared.getPage(0).node.Resources();
    const xObjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    const hasDirectImage =
      xObjects?.values().some((value) => {
        const stream = prepared.context.lookupMaybe(value, PDFStream);
        return (
          stream?.dict.lookupMaybe(PDFName.of('Subtype'), PDFName) ===
          PDFName.of('Image')
        );
      }) ?? false;
    expect(hasDirectImage).toBe(true);

    expect(prepared.getPage(1).getSize()).toEqual({ width: 320, height: 152 });
    expect(result.signOptions).toEqual({
      visible: true,
      page: 2,
      x: 16,
      y: 16,
      width: 288,
      height: 96,
    });
  });

  it('normalizes a decimal A4 page into compact integer provider geometry', async () => {
    const original = await PDFDocument.create();
    original.addPage([595.2756, 841.8898]);

    const result = await preparePdfForSigning({
      originalPdf: Buffer.from(await original.save()),
      imageBuffer: null,
      signOptions: { visible: true },
    });

    const prepared = await PDFDocument.load(result.pdfBuffer);
    const providerPage = prepared.getPage(1).getSize();
    const { x, y, width, height } = result.signOptions;

    expect(providerPage.width).toBe(595);
    expect(providerPage.height).toBeLessThanOrEqual(176);
    expect([x, y, width, height].every(Number.isInteger)).toBe(true);
    expect((x ?? 0) + (width ?? 0)).toBeLessThanOrEqual(providerPage.width);
    expect((y ?? 0) + (height ?? 0)).toBeLessThanOrEqual(providerPage.height);
  });

  it('does not stamp a manual image when the user selected an invisible signature', async () => {
    const original = await PDFDocument.create();
    original.addPage([300, 400]);

    const result = await preparePdfForSigning({
      originalPdf: Buffer.from(await original.save()),
      imageBuffer: await readFile(SIGNATURE_IMAGE_PATH),
      signOptions: { visible: false },
    });

    const prepared = await PDFDocument.load(result.pdfBuffer);
    const resources = prepared.getPage(0).node.Resources();
    const xObjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    expect(xObjects?.keys().length ?? 0).toBe(0);
    expect(result.signOptions.page).toBe(2);
  });

  it('rejects a visible signature when its configured image is unavailable', async () => {
    const original = await PDFDocument.create();
    original.addPage([300, 400]);

    await expect(
      preparePdfForSigning({
        originalPdf: Buffer.from(await original.save()),
        imageBuffer: null,
        signOptions: {
          visible: true,
          imageFileName: 'firma.png',
          page: 1,
          x: 20,
          y: 20,
          width: 100,
          height: 50,
        },
      }),
    ).rejects.toThrow('Configured signature image is unavailable');
  });
});
