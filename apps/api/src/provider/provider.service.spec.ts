import { ProviderService } from './provider.service';
import type { CertificateClient } from './clients/certificate.client';
import type { ChallengeClient } from './clients/challenge.client';
import type { ClaveUnicaClient } from './clients/clave-unica.client';
import type { DocumentExchangeClient } from './clients/document-exchange.client';
import type { RaClient } from './clients/ra.client';
import type { ExternalProfile } from './types';

describe('ProviderService.createRaRequest', () => {
  const profile: ExternalProfile = {
    rut: '11111111-1',
    numeroDocumento: '11111111',
    nombres: 'Nombre',
    apellidoPaterno: 'Paterno',
    apellidoMaterno: 'Materno',
    email: 'test@email.com',
    fechaNacimiento: '11-01-1980',
    estadoCivil: 'Soltero',
    telefono: '912341234',
  };

  const buildService = (raClient: Partial<RaClient>) => {
    return new ProviderService(
      {} as ClaveUnicaClient,
      {} as ChallengeClient,
      raClient as RaClient,
      {} as CertificateClient,
      {} as DocumentExchangeClient,
    );
  };

  beforeEach(() => {
    process.env.SIGNING_PROVIDER_MODE = 'live';
  });

  afterEach(() => {
    delete process.env.SIGNING_PROVIDER_MODE;
  });

  it('sends ClaveUnica and challenge validation ids comma-separated', async () => {
    const createRequest = jest.fn().mockResolvedValue({
      nroSolicitud: '15400000',
      downloadPin: '4jyQ00',
      raw: {},
    });
    const service = buildService({ createRequest });

    await service.createRaRequest({
      providerContext: {
        externalProfile: profile,
        claveIdValidation: '8Gpyg7pFUG5jD',
        idValidation: '1R3h4htrtmT',
      },
    });

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ idValidation: '8Gpyg7pFUG5jD,1R3h4htrtmT' }),
    );
  });

  it('sends only the challenge validation id when ClaveUnica id is missing', async () => {
    const createRequest = jest.fn().mockResolvedValue({
      nroSolicitud: '15400000',
      downloadPin: '4jyQ00',
      raw: {},
    });
    const service = buildService({ createRequest });

    await service.createRaRequest({
      providerContext: {
        externalProfile: profile,
        idValidation: '1R3h4htrtmT',
      },
    });

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ idValidation: '1R3h4htrtmT' }),
    );
  });

  it('does not repeat the id when both validation ids are equal', async () => {
    const createRequest = jest.fn().mockResolvedValue({
      nroSolicitud: '15400000',
      downloadPin: '4jyQ00',
      raw: {},
    });
    const service = buildService({ createRequest });

    await service.createRaRequest({
      providerContext: {
        externalProfile: profile,
        claveIdValidation: '1R3h4htrtmT',
        idValidation: '1R3h4htrtmT',
      },
    });

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ idValidation: '1R3h4htrtmT' }),
    );
  });
});
