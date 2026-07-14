import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  AuthSession,
  CreateSigningProcessResponse,
  PaymentEligibilityResponse,
} from '@firmador/shared';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { UserIdentityEntity } from '../src/identity/entities/user-identity.entity';

const describeSupabaseE2e =
  process.env.RUN_SUPABASE_E2E === '1' ? describe : describe.skip;

describeSupabaseE2e('Live provider payment eligibility (Supabase e2e)', () => {
  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];
  let operatorPassword: string;
  let identityRepository: Repository<UserIdentityEntity>;

  const createPdf = async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    page.drawText('Live payment PDF');
    return Buffer.from(await document.save());
  };

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = randomUUID();
    process.env.SIGNING_PROVIDER_MODE = 'live';
    process.env.WEB_BASE_URL = 'http://localhost:4321';
    process.env.API_BASE_URL = 'http://localhost:3000';
    process.env.DATABASE_SCHEMA = process.env.DATABASE_SCHEMA ?? 'public';
    process.env.DATABASE_SYNCHRONIZE =
      process.env.DATABASE_SYNCHRONIZE ?? 'false';
    process.env.SUPABASE_STORAGE_BUCKET =
      process.env.SUPABASE_STORAGE_BUCKET ?? 'documents';
    process.env.SEED_ADMIN_EMAIL = 'admin@firmador.local';
    process.env.SEED_ADMIN_PASSWORD = randomUUID();
    process.env.SEED_OPERATOR_EMAIL = 'operador@firmador.local';
    operatorPassword = randomUUID();
    process.env.SEED_OPERATOR_PASSWORD = operatorPassword;
    process.env.PROVIDER_USERNAME = 'provider-user';
    process.env.PROVIDER_PASSWORD = 'provider-password';
    process.env.PROVIDER_CERT_DOWNLOAD_USER = 'download-user';
    process.env.PROVIDER_CERT_DOWNLOAD_PASSWORD = 'download-password';
    process.env.PROVIDER_RUT_EMPRESA = '76123456-7';
    process.env.PROVIDER_ORIGIN = 'reddata_idyfdd';
    process.env.PROVIDER_PIN_FIRMA = '1234';
    process.env.DEFAULT_CERTIFICATE_PASSWORD = '1234';

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
    identityRepository = app.get(getRepositoryToken(UserIdentityEntity));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns live mode for a configured process with a complete identity', async () => {
    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email: 'operador@firmador.local',
        password: operatorPassword,
      })
      .expect(201);
    const cookies = loginResponse.get('Set-Cookie') ?? [];
    const session = loginResponse.body as AuthSession;

    await identityRepository.save(
      identityRepository.create({
        userId: session.user.id,
        status: 'READY',
        rut: '11.111.111-1',
        nombres: 'Operador',
        apellidoPaterno: 'Live',
        apellidoMaterno: 'Firmador',
        email: session.user.email,
        telefono: '56912345678',
        numeroDocumento: '123456789',
        fechaNacimiento: '1990-01-10',
        estadoCivil: 'Soltero',
        claveUnicaValidatedAt: new Date(),
        externalAuthState: null,
      }),
    );

    const balanceResponse = await request(httpServer)
      .get('/api/balance')
      .set('Cookie', cookies)
      .expect(200);
    let expectedBalance = (balanceResponse.body as { currentBalance: number })
      .currentBalance;
    if (expectedBalance < 1) {
      const purchaseResponse = await request(httpServer)
        .post('/api/balance/purchases')
        .set('Cookie', cookies)
        .send({ operationId: randomUUID(), credits: 1 })
        .expect(201);
      expectedBalance = (purchaseResponse.body as { currentBalance: number })
        .currentBalance;
    }

    const createResponse = await request(httpServer)
      .post('/api/signing/processes')
      .set('Cookie', cookies)
      .field('visible', 'true')
      .field('page', '1')
      .field('x', '120')
      .field('y', '80')
      .field('width', '160')
      .field('height', '64')
      .attach('pdf', await createPdf(), {
        filename: 'live-payment.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const createBody = createResponse.body as CreateSigningProcessResponse;
    const paymentResponse = await request(httpServer)
      .get(`/api/signing/processes/${createBody.processId}/payment`)
      .set('Cookie', cookies)
      .expect(200);

    expect(paymentResponse.body as PaymentEligibilityResponse).toMatchObject({
      mode: 'live',
      eligible: true,
      costCredits: 1,
      availableCredits: expectedBalance,
      reason: 'READY',
    });
  });
});
