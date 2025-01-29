import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Injectable()
export class EmailActivities {
  constructor(private readonly emailService: EmailService) {
  }

  async sendEmail(email: string): Promise<void> {
    return this.emailService.sendEmail(email);
  }
}

// Export activity type for type safety
export interface ActivityTypes {
  sendEmail: (email: string) => Promise<void>;
}