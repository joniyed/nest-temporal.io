import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;

  constructor(private configService: ConfigService) {
  }

  // This method runs on app startup (One-time login)
  async onModuleInit() {
    this.fromEmail = this.configService.get<string>('SMTP_SENDER_EMAIL', 'no-reply@example.com');
    // Create a single transporter for the lifetime of the app
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USERNAME'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    try {
      // Check if connection is established successfully
      this.logger.log('Trying to SMTP connection establish');
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (error) {
      this.logger.error('Failed to establish SMTP connection', error.stack);
      throw error;
    }
  }

  // Send email using the established transporter
  async sendEmail(to: string): Promise<void> {
    console.log(`Sending email to: ${to}`);
    console.log(`Sending email from: ${this.fromEmail}`);

    try {
      await this.transporter.sendMail({
        from: `"Email Service" <${this.fromEmail}>`, // Dynamically set from email
        to,
        subject: 'Your Subject',
        text: 'Email content',
        html: '<b>Email content</b>',
      });

      this.logger.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
