import { loadAppConfig } from './config/app.config';
import { createApp } from './create-app';

async function bootstrap() {
  const app = await createApp();
  const config = loadAppConfig();
  await app.listen(config.apiPort);
}
void bootstrap();
