import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  AuthSession,
  CreateSigningProcessResponse,
  IdentityStatusResponse,
  PaymentEligibilityResponse,
  SigningProcessDetail,
} from '@firmador/shared';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';

const describeSupabaseE2e =
  process.env.RUN_SUPABASE_E2E === '1' ? describe : describe.skip;

describeSupabaseE2e('Firmador flow (Supabase e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];
  let adminPassword: string;
  let operatorPassword: string;

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
        password: operatorPassword,
      })
      .expect(201);

    const cookies = loginResponse.get('Set-Cookie');
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('firmador_access')]),
    );
    return cookies ?? [];
  };

  const loginAdmin = async () => {
    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email: 'admin@firmador.local',
        password: adminPassword,
      })
      .expect(201);

    const cookies = loginResponse.get('Set-Cookie');
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('firmador_access')]),
    );
    return cookies ?? [];
  };

  const startRegistration = async () => {
    const authorizeResponse = await request(httpServer)
      .get('/api/registration/clave-unica/authorize')
      .expect(200);
    const authorization = authorizeResponse.body as { url: string };
    expect(authorization.url).toContain(
      '/api/registration/clave-unica/callback',
    );

    const callbackUrl = new URL(authorization.url);
    const callbackResponse = await request(httpServer)
      .get(`${callbackUrl.pathname}${callbackUrl.search}`)
      .expect(302);
    const redirectLocation = callbackResponse.get('Location') ?? '';
    expect(redirectLocation).toContain('/register/complete?state=');

    const state = new URL(redirectLocation).searchParams.get('state') ?? '';
    expect(state).toBeTruthy();
    return state;
  };

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = randomUUID();
    process.env.SIGNING_PROVIDER_MODE = 'mock';
    process.env.WEB_BASE_URL = 'http://localhost:4321';
    process.env.API_BASE_URL = 'http://localhost:3000';
    process.env.DATABASE_SCHEMA = process.env.DATABASE_SCHEMA ?? 'public';
    process.env.DATABASE_SYNCHRONIZE =
      process.env.DATABASE_SYNCHRONIZE ?? 'false';
    process.env.SUPABASE_STORAGE_BUCKET =
      process.env.SUPABASE_STORAGE_BUCKET ?? 'documents';
    process.env.SEED_ADMIN_EMAIL = 'admin@firmador.local';
    adminPassword = randomUUID();
    process.env.SEED_ADMIN_PASSWORD = adminPassword;
    process.env.SEED_OPERATOR_EMAIL = 'operador@firmador.local';
    operatorPassword = randomUUID();
    process.env.SEED_OPERATOR_PASSWORD = operatorPassword;

    const { AppModule } = await import('../src/app.module');
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
  });

  it('registers a public user with ClaveUnica and allows later password login', async () => {
    const state = await startRegistration();

    const statusResponse = await request(httpServer)
      .get(`/api/registration/${state}`)
      .expect(200);
    expect(statusResponse.body).toMatchObject({
      status: 'VALIDATED',
      profile: {
        rut: '22.222.222-2',
        nombres: 'Registro',
        apellidoPaterno: 'Mock',
        apellidoMaterno: 'Firmador',
      },
      missingFields: [
        'telefono',
        'numeroDocumento',
        'fechaNacimiento',
        'estadoCivil',
      ],
    });

    const email = `registro-${randomUUID()}@firmador.local`;
    const password = `Pass-${randomUUID()}`;
    const completeResponse = await request(httpServer)
      .post(`/api/registration/${state}/complete`)
      .send({
        email,
        password,
        telefono: '56912345678',
        numeroDocumento: '123456789',
        fechaNacimiento: '1990-01-10',
        estadoCivil: 'Soltero',
      })
      .expect(201);

    expect(completeResponse.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.stringContaining('firmador_access')]),
    );
    expect(completeResponse.body as AuthSession).toMatchObject({
      user: {
        email,
        fullName: 'Registro Mock Firmador',
        role: 'operator',
      },
    });

    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    expect(loginResponse.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.stringContaining('firmador_access')]),
    );
  });

  it('rejects registration completion with a duplicated email', async () => {
    const state = await startRegistration();

    await request(httpServer)
      .post(`/api/registration/${state}/complete`)
      .send({
        email: 'admin@firmador.local',
        password: `Pass-${randomUUID()}`,
        telefono: '56912345678',
        numeroDocumento: '123456789',
        fechaNacimiento: '1990-01-10',
        estadoCivil: 'Soltero',
      })
      .expect(409);
  });

  it('rejects registration completion with a duplicated RUN', async () => {
    const secondState = await startRegistration();
    await request(httpServer)
      .post(`/api/registration/${secondState}/complete`)
      .send({
        email: `rut-b-${randomUUID()}@firmador.local`,
        password: `Pass-${randomUUID()}`,
        telefono: '56912345678',
        numeroDocumento: '123456789',
        fechaNacimiento: '1990-01-10',
        estadoCivil: 'Soltero',
      })
      .expect(409);
  });

  it('enables the demo-first flow after mock identity onboarding', async () => {
    const authCookies = await loginOperator();

    const balanceResponse = await request(httpServer)
      .get('/api/balance')
      .set('Cookie', authCookies)
      .expect(200);
    let expectedBalance = (balanceResponse.body as { currentBalance: number })
      .currentBalance;
    if (expectedBalance < 1) {
      const purchaseResponse = await request(httpServer)
        .post('/api/balance/purchases')
        .set('Cookie', authCookies)
        .send({ operationId: randomUUID(), credits: 1 })
        .expect(201);
      expectedBalance = (purchaseResponse.body as { currentBalance: number })
        .currentBalance;
    }

    const initialIdentityResponse = await request(httpServer)
      .get('/api/identity/me')
      .set('Cookie', authCookies)
      .expect(200);

    expect(initialIdentityResponse.body).toMatchObject({
      status: 'NOT_STARTED',
      canSign: false,
    });

    const authorizeResponse = await request(httpServer)
      .get('/api/identity/clave-unica/authorize')
      .set('Cookie', authCookies)
      .expect(200);

    const authorization = authorizeResponse.body as { url: string };
    expect(authorization.url).toContain('/api/identity/clave-unica/callback');

    const callbackUrl = new URL(authorization.url);
    await request(httpServer)
      .get(`${callbackUrl.pathname}${callbackUrl.search}`)
      .expect(302)
      .expect('Location', 'http://localhost:4321/identity');

    const validatedIdentityResponse = await request(httpServer)
      .get('/api/identity/me')
      .set('Cookie', authCookies)
      .expect(200);

    const validatedIdentityBody =
      validatedIdentityResponse.body as IdentityStatusResponse;
    expect(validatedIdentityBody.status).toBe('VALIDATED');
    expect(validatedIdentityBody.canSign).toBe(false);
    expect(validatedIdentityBody.missingFields).toEqual(
      expect.arrayContaining([
        'numeroDocumento',
        'fechaNacimiento',
        'estadoCivil',
        'telefono',
      ]),
    );

    const readyIdentityResponse = await request(httpServer)
      .patch('/api/identity/profile')
      .set('Cookie', authCookies)
      .send({
        numeroDocumento: '123456789',
        fechaNacimiento: '1990-01-10',
        estadoCivil: 'Soltero',
        telefono: '56912345678',
      })
      .expect(200);

    const readyIdentityBody =
      readyIdentityResponse.body as IdentityStatusResponse;
    expect(readyIdentityBody.status).toBe('READY');
    expect(readyIdentityBody.canSign).toBe(true);

    const createResponse = await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', authCookies)
      .attach('pdf', await createPdf(), {
        filename: 'demo-ui-flow.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const createBody = createResponse.body as CreateSigningProcessResponse;
    expect(createBody.status).toBe('UPLOADED');

    const processId = createBody.processId;
    const configuredResponse = await request(httpServer)
      .patch(`/api/signing/processes/${processId}/sign-options`)
      .set('Cookie', authCookies)
      .send({
        visible: true,
        page: 1,
        x: 100,
        y: 90,
        width: 180,
        height: 70,
      })
      .expect(200);

    const configuredBody = configuredResponse.body as SigningProcessDetail;
    expect(configuredBody.status).toBe('CONFIGURED');

    const paymentResponse = await request(httpServer)
      .get(`/api/signing/processes/${processId}/payment`)
      .set('Cookie', authCookies)
      .expect(200);

    const paymentBody = paymentResponse.body as PaymentEligibilityResponse;
    expect(paymentBody).toMatchObject({
      mode: 'mock',
      eligible: true,
      costCredits: 1,
      availableCredits: expectedBalance,
      reason: 'READY',
    });

    const signedResponse = await request(httpServer)
      .post(`/api/signing/processes/${processId}/start-signing`)
      .set('Cookie', authCookies)
      .expect(201);

    const signedBody = signedResponse.body as SigningProcessDetail;
    expect(signedBody.status).toBe('SIGNED');
    expect(signedBody.nextStep).toBe('download');

    await request(httpServer)
      .get(`/api/signing/processes/${processId}/download`)
      .set('Cookie', authCookies)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
  });

  it('blocks administrators from signer APIs', async () => {
    const authCookies = await loginAdmin();

    await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', authCookies)
      .field('visible', 'true')
      .field('page', '1')
      .field('x', '120')
      .field('y', '80')
      .field('width', '160')
      .field('height', '64')
      .attach('pdf', await createPdf(), {
        filename: 'blocked-demo.pdf',
        contentType: 'application/pdf',
      })
      .expect(403);

    await request(httpServer)
      .get('/api/history')
      .set('Cookie', authCookies)
      .expect(403);
    await request(httpServer)
      .get('/api/identity/me')
      .set('Cookie', authCookies)
      .expect(403);
    await request(httpServer)
      .get('/api/balance')
      .set('Cookie', authCookies)
      .expect(403);
  });

  it('completes the visual placement happy path with the mock provider', async () => {
    const authCookies = await loginOperator();
    const originalPdf = await createPdf();

    await request(httpServer)
      .post('/api/balance/purchases')
      .set('Cookie', authCookies)
      .send({ operationId: randomUUID(), credits: 1 })
      .expect(201);

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
      .post(`/api/signing/processes/${processId}/authorize`)
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
      .post(`/api/signing/processes/${processId}/authorize`)
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
