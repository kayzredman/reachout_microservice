import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationPrefs } from './notification-prefs.entity';
import { NotificationPrefsModule } from './notification-prefs.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_notification',
      entities: [NotificationPrefs],
      synchronize: true,
    }),
    NotificationPrefsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
