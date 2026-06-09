import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  CreateSigningProcessResponse,
  SigningProcessDetail,
} from '@firmador/shared';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Firmador flow (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let tempRoot: string;
  let httpServer: Parameters<typeof request>[0];

  const createPdf = async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    page.drawText('Demo PDF');
    return Buffer.from(await document.save());
  };

  const loginOperator = async () => {
    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email: 'operador@firmador.local',
        password: 'Operador1234!',
      })
      .expect(201);

    const cookies = loginResponse.get('Set-Cookie');
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('firmador_access')]),
    );
    return cookies ?? [];
  };

  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'firmador-e2e-'));
    process.env.STORAGE_ROOT = join(tempRoot, 'storage');
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    process.env.SIGNING_PROVIDER_MODE = 'mock';
    process.env.WEB_BASE_URL = 'http://localhost:4321';
    process.env.API_BASE_URL = 'http://localhost:3000';
    process.env.SQLITE_LOCATION = join(tempRoot, 'firmador.sqlite');
    process.env.SEED_ADMIN_EMAIL = 'admin@firmador.local';
    process.env.SEED_ADMIN_PASSWORD = 'Admin1234!';
    process.env.SEED_OPERATOR_EMAIL = 'operador@firmador.local';
    process.env.SEED_OPERATOR_PASSWORD = 'Operador1234!';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (existsSync(tempRoot)) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('completes the visual placement happy path with the mock provider', async () => {
    const authCookies = await loginOperator();
    const originalPdf = await createPdf();

    const createResponse = await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', authCookies)
      .attach('pdf', originalPdf, {
        filename: 'demo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const createBody = createResponse.body as CreateSigningProcessResponse;
    const processId = createBody.processId;
    expect(processId).toBeTruthy();
    expect(createBody.status).toBe('UPLOADED');
    expect(createBody.nextStep).toBe('configure');

    await request(httpServer)
      .get(`/api/signing/processes/${processId}/original`)
      .set('Cookie', authCookies)
      .expect(200)
      .expect('Cache-Control', /no-store/)
      .expect('Content-Type', /application\/pdf/);

    await request(httpServer)
      .get(`/api/signing/processes/${processId}/authorize`)
      .set('Cookie', authCookies)
      .expect(400);

    const configuredResponse = await request(httpServer)
      .patch(`/api/signing/processes/${processId}/sign-options`)
      .set('Cookie', authCookies)
      .send({
        visible: true,
        page: 1,
        x: 120,
        y: 80,
        width: 160,
        height: 64,
      })
      .expect(200);

    const configuredBody = configuredResponse.body as SigningProcessDetail;
    expect(configuredBody.status).toBe('CONFIGURED');
    expect(configuredBody.nextStep).toBe('authorize');
    expect(configuredBody.pdfMetadata?.pageCount).toBe(1);

    const authorizeResponse = await request(httpServer)
      .get(`/api/signing/processes/${processId}/authorize`)
      .set('Cookie', authCookies)
      .expect(200);

    const authorizeBody = authorizeResponse.body as { url: string };
    const callbackUrl = new URL(authorizeBody.url);
    await request(httpServer)
      .get(`${callbackUrl.pathname}${callbackUrl.search}`)
      .expect(302);

    const challengeResponse = await request(httpServer)
      .get(`/api/signing/processes/${processId}`)
      .set('Cookie', authCookies)
      .expect(200);

    const challengeBody = challengeResponse.body as SigningProcessDetail;
    expect(challengeBody.status).toBe('CHALLENGE_PENDING');
    const idChallenge = challengeBody.challenge?.idChallenge ?? '';

    await request(httpServer)
      .post(`/api/signing/processes/${processId}/challenge`)
      .set('Cookie', authCookies)
      .send({
        idChallenge,
        answers: [
          { question: 1, answer: 1 },
          { question: 2, answer: 2 },
          { question: 3, answer: 3 },
          { question: 4, answer: 4 },
        ],
      })
      .expect(201);

    const signedResponse = await request(httpServer)
      .get(`/api/signing/processes/${processId}`)
      .set('Cookie', authCookies)
      .expect(200);

    const signedBody = signedResponse.body as SigningProcessDetail;
    expect(signedBody.status).toBe('SIGNED');

    const downloadResponse = await request(httpServer)
      .get(`/api/signing/processes/${processId}/download`)
      .set('Cookie', authCookies)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    const signedPdfBuffer = Buffer.from(downloadResponse.body as Buffer);
    const signedPdf = await PDFDocument.load(signedPdfBuffer);
    expect(signedPdf.getPageCount()).toBe(1);
    expect(signedPdfBuffer.length).toBeGreaterThan(originalPdf.length);
  });

  it('keeps backward-compatible creation with initial coordinates', async () => {
    const authCookies = await loginOperator();

    const createResponse = await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', authCookies)
      .field('visible', 'true')
      .field('page', '1')
      .field('x', '120')
      .field('y', '80')
      .field('width', '160')
      .field('height', '64')
      .attach('pdf', await createPdf(), {
        filename: 'legacy-demo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const createBody = createResponse.body as CreateSigningProcessResponse;
    expect(createBody.status).toBe('CONFIGURED');
    expect(createBody.nextStep).toBe('authorize');
  });
});
