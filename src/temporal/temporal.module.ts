import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemporalService } from './temporal.service';
import { EmailActivities } from './activities';
import { EmailService } from '../email/email.service';

@Module({
  imports: [ConfigModule],
  providers: [TemporalService, EmailActivities, EmailService],
  exports: [TemporalService],
})
export class TemporalModule {
}
