import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller.js';
import { PaymentModule } from './payment.module.js';
import { Payment } from './payment.entity.js';

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
      entities: [Payment],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    PaymentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
