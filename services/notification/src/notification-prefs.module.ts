import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPrefs } from './notification-prefs.entity';
import { NotificationService } from './notification.service';
import { NotificationPrefsController } from './notification-prefs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPrefs])],
  controllers: [NotificationPrefsController],
  providers: [NotificationService],
})
export class NotificationPrefsModule {}
