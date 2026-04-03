import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  new Logger('Bootstrap').log(`Content-planner service running on port ${port}`);
}
bootstrap();
