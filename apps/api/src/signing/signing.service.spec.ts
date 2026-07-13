import type { Express } from 'express';
import { SigningProcessEntity } from './entities/signing-process.entity';
import { SigningService } from './signing.service';

describe('SigningService', () => {
  it('persists the uploaded signature image reference in process metadata', async () => {
    let savedProcess: SigningProcessEntity | undefined;
    const processRepository = {
      create: jest.fn((input: Record<string, unknown>) => {
        const process = new SigningProcessEntity();
        Object.assign(process, {
          id: input.id,
          userId: input.userId,
          documentId: input.documentId,
          document: input.document,
          accountId: input.accountId,
          account: input.account,
          provider: input.provider,
          providerProcessId: input.providerProcessId,
          requestedAt: input.requestedAt,
          signedStoragePath: input.signedStoragePath,
          expiresAt: input.expiresAt,
          signedAt: input.signedAt,
          metadata: {},
        });
        return process;
      }),
      save: jest.fn((process: SigningProcessEntity) => {
        savedProcess = process;
        return Promise.resolve(process);
      }),
    };
    const documentRepository = {
      create: jest.fn((input: Record<string, unknown>) => input),
      save: jest.fn((document: Record<string, unknown>) =>
        Promise.resolve({
          ...document,
          id: 'document-id',
        }),
      ),
    };
    const fileStore = {
      save: jest.fn((processId: string, kind: string) =>
        Promise.resolve(`${processId}/${kind}.bin`),
      ),
    };

    const service = new SigningService(
      processRepository as never,
      {} as never,
      documentRepository as never,
      {} as never,
      {
        findOne: jest.fn(() => Promise.resolve({ id: 'account-id' })),
      } as never,
      {
        findOne: jest.fn(() => Promise.resolve({ id: 'status-id' })),
      } as never,
      {
        validatePdf: jest.fn(() =>
          Promise.resolve({
            mimeType: 'application/pdf',
            sizeBytes: 4,
            sha256: 'pdf-sha256',
            pdfMetadata: {
              pageCount: 1,
              pages: [{ page: 1, width: 612, height: 792, rotation: 0 }],
            },
          }),
        ),
      } as never,
      fileStore as never,
      {} as never,
      { record: jest.fn(() => Promise.resolve(undefined)) } as never,
      {} as never,
      {} as never,
    );
    const pdfFile = {
      originalname: 'documento.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File;
    const imageFile = {
      originalname: 'firma.png',
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    } as Express.Multer.File;

    await service.createProcess(
      {
        id: 'user-id',
        email: 'user@example.test',
        fullName: 'Test User',
        role: 'operator',
      },
      pdfFile,
      imageFile,
      {},
    );

    expect(savedProcess?.signatureImageStoragePath).toMatch(
      /\/signature-image\.bin$/,
    );
    expect(savedProcess?.signOptions.imageFileName).toBe('firma.png');
  });
});
