import { Body, Controller, Param, Post } from '@nestjs/common';
import { Client } from '@temporalio/client';
import { sendEmailWorkflow } from '../temporal/workflows';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly temporalClient: Client,
    private readonly emailService: EmailService,
  ) {
  }

  @Post('send-email')
  async sendEmail(@Body() { emails }: { emails: string[] }) {
    console.log('Emails: ', emails);
    const handle = await this.temporalClient.workflow.start(sendEmailWorkflow, {
      taskQueue: 'email-queue',
      workflowId: `send-email-${Date.now()}`,
      args: [emails],
    });

    return {
      workflowId: handle.workflowId,
      status: 'WORKFLOW_STARTED',
    };
  }

  @Post('/test/:email')
  async sendTestEmail(@Param('email') email: string) {
    return await this.emailService.sendEmail(email);
  }
}
