import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller.js';
import { PaymentModule } from './payment.module.js';
import { Payment } from './payment.entity.js';
import { HealthController } from './common/health.controller.js';
import { GracefulShutdownService } from './common/graceful-shutdown.service.js';
import { ResilientHttpService } from './common/resilient-http.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '.env') }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_payment',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [Payment],
      synchronize: false,
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations_payment',
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    PaymentModule,
  ],
  controllers: [AppController, HealthController],
  providers: [GracefulShutdownService, ResilientHttpService],
  exports: [ResilientHttpService],
})
export class AppModule {}
