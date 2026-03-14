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
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Firmador flow (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let tempRoot: string;
  let httpServer: Parameters<typeof request>[0];

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

  it('completes the happy path with the mock provider', async () => {
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
    const authCookies = cookies ?? [];

    const createResponse = await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', authCookies)
      .field('visible', 'true')
      .field('page', '1')
      .field('x', '120')
      .field('y', '80')
      .field('width', '160')
      .field('height', '64')
      .attach(
        'pdf',
        Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF', 'utf8'),
        'demo.pdf',
      )
      .expect(201);

    const createBody = createResponse.body as CreateSigningProcessResponse;
    const processId = createBody.processId;
    expect(processId).toBeTruthy();

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

    await request(httpServer)
      .get(`/api/signing/processes/${processId}/download`)
      .set('Cookie', authCookies)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
  });
});
