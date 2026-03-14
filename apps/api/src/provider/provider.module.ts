import { forwardRef, Module } from '@nestjs/common';
import { SigningModule } from '../signing/signing.module';
import { CertificateClient } from './clients/certificate.client';
import { ChallengeClient } from './clients/challenge.client';
import { ClaveUnicaClient } from './clients/clave-unica.client';
import { DocumentExchangeClient } from './clients/document-exchange.client';
import { RaClient } from './clients/ra.client';
import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

@Module({
  imports: [forwardRef(() => SigningModule)],
  controllers: [ProviderController],
  providers: [
    ProviderService,
    ClaveUnicaClient,
    ChallengeClient,
    RaClient,
    CertificateClient,
    DocumentExchangeClient,
  ],
  exports: [ProviderService],
})
export class ProviderModule {}
