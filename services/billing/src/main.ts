import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  app.enableCors({ origin: '*' });
  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  new Logger('Bootstrap').log(`Billing service running on port ${port}`);
}
bootstrap();
