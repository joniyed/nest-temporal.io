import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemporalModule } from './temporal/temporal.module';
import { EmailModule } from './email/email.module';
import { BaseController } from './base.controller';

@Module({
  controllers: [BaseController],
  imports: [ConfigModule.forRoot(), TemporalModule, EmailModule],
})
export class AppModule {
}