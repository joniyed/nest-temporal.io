import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { Client } from '@temporalio/client';

@Module({
  imports: [],
  controllers: [EmailController],
  providers: [EmailService, ConfigService, Client],
})
export class EmailModule {
}