import type { Express } from 'express';
import { PDFDocument } from 'pdf-lib';
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
      {
        ensureAccount: jest.fn(() =>
          Promise.resolve({ id: 'account-id', currentBalance: 1 }),
        ),
      } as never,
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

  it('does not restart ClaveUnica when direct signing with an active registration fails', async () => {
    const originalMode = process.env.SIGNING_PROVIDER_MODE;
    const originalWebBaseUrl = process.env.WEB_BASE_URL;
    process.env.SIGNING_PROVIDER_MODE = 'live';
    process.env.WEB_BASE_URL = 'https://web.example.test';

    const pdf = await PDFDocument.create();
    pdf.addPage([595.2756, 841.8898]);
    const originalPdf = Buffer.from(await pdf.save());
    const processEntity = new SigningProcessEntity();
    Object.assign(processEntity, {
      id: 'process-id',
      userId: 'user-id',
      documentId: 'document-id',
      document: {
        id: 'document-id',
        originalFileName: 'documento.pdf',
        storagePath: 'process-id/original.pdf',
      },
      expiresAt: new Date(Date.now() + 60_000),
      errorMessage: null,
      metadata: {
        currentStep: 'CONFIGURED',
        originalStoragePath: 'process-id/original.pdf',
        signOptions: {
          visible: true,
          page: 1,
          x: 20,
          y: 20,
          width: 100,
          height: 50,
        },
        pdfMetadata: {
          pageCount: 1,
          pages: [{ page: 1, width: 595.2756, height: 841.8898, rotation: 0 }],
        },
      },
    });
    const processRepository = {
      findOne: jest.fn(() => Promise.resolve(processEntity)),
      save: jest.fn((value: SigningProcessEntity) => Promise.resolve(value)),
    };
    const registration = {
      id: 'registration-id',
      userId: 'user-id',
      provider: 'FIRMA_CL',
      status: 'ACTIVE',
      validUntil: new Date(Date.now() + 60_000),
      providerContextEncrypted: 'encrypted-registration',
    };
    const registrationRepository = {
      findOne: jest.fn(({ where }: { where: { status: string } }) =>
        Promise.resolve(where.status === 'ACTIVE' ? registration : null),
      ),
    };
    const providerService = {
      signDocument: jest
        .fn()
        .mockRejectedValue(new Error('Document signing exchange failed')),
      createAuthorization: jest.fn(() =>
        Promise.resolve({
          redirectUrl: 'https://clave-unica.example.test',
          providerContext: {},
        }),
      ),
    };
    const service = new SigningService(
      processRepository as never,
      registrationRepository as never,
      {} as never,
      {} as never,
      {
        findOne: jest.fn(() => Promise.resolve({ id: 'status-id' })),
      } as never,
      {} as never,
      {
        read: jest.fn(() => Promise.resolve(originalPdf)),
      } as never,
      {
        openJson: jest.fn(() => ({
          pinFirma: '1234',
          configurationName: 'config',
        })),
        sealJson: jest.fn(() => 'sealed'),
      } as never,
      { record: jest.fn(() => Promise.resolve(undefined)) } as never,
      {
        getStatus: jest.fn(() =>
          Promise.resolve({
            canSign: true,
            profile: { email: 'user@example.test' },
          }),
        ),
        ensureCanSign: jest.fn(() => Promise.resolve(undefined)),
      } as never,
      providerService as never,
      {
        getCurrentBalance: jest.fn(() => Promise.resolve(1)),
        reserveForProcess: jest.fn(() => Promise.resolve(0)),
        refundForProcess: jest.fn(() => Promise.resolve(true)),
      } as never,
    );
    if (originalMode === undefined) {
      delete process.env.SIGNING_PROVIDER_MODE;
    } else {
      process.env.SIGNING_PROVIDER_MODE = originalMode;
    }
    if (originalWebBaseUrl === undefined) {
      delete process.env.WEB_BASE_URL;
    } else {
      process.env.WEB_BASE_URL = originalWebBaseUrl;
    }

    const result = await service.getAuthorizationUrl(
      {
        id: 'user-id',
        email: 'user@example.test',
        fullName: 'Test User',
        role: 'operator',
      },
      'process-id',
    );

    expect(result.url).toBe('https://web.example.test/sign/process-id/result');
    expect(processEntity.status).toBe('FAILED');
    expect(processEntity.errorMessage).toBe('Document signing exchange failed');
    expect(providerService.createAuthorization).not.toHaveBeenCalled();
  });
});
