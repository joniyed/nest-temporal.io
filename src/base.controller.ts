import { Controller, Post } from '@nestjs/common';

// import { Client } from '@temporalio/client';

@Controller('')
export class BaseController {
  constructor() {
  }


  @Post('')
  async sendSingleEmail() {
    // await this.emailService.sendEmail(email);
    return { message: `Email successfully sent 3232` };
  }

}
