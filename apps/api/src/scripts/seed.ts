import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const authService = app.get(AuthService);
    await authService.seedDefaultUsers();
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
