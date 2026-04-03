import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  app.enableCors();
  const port = process.env.PORT || 3012;
  await app.listen(port);
  new Logger('Bootstrap').log(`Support service running on port ${port}`);
}
bootstrap();
