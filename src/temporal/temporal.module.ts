import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemporalService } from './temporal.service';
import { Activities } from './activities';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, EmailModule],
  providers: [TemporalService, Activities],
  exports: [TemporalService],
})
export class TemporalModule {
}
