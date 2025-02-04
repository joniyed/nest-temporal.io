import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as imap from 'imap-simple';
import { ParsedMail, simpleParser } from 'mailparser';
import { saveEmailsToPDF } from './pdf.service';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;

  private readonly imapConfig = {
    imap: {
      user: this.configService.get<string>('SMTP_USERNAME'),
      password: this.configService.get<string>('SMTP_PASSWORD'),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  };

  constructor(private configService: ConfigService) {
  }

  async onModuleInit() {
    this.fromEmail = this.configService.get<string>('SMTP_SENDER_EMAIL', 'no-reply@example.com');
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
      this.logger.log('Trying to SMTP connection establish');
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (error) {
      this.logger.error('Failed to establish SMTP connection', error.stack);
      throw error;
    }
  }

  async sendEmail(to: string): Promise<void> {
    console.log(`Sending email to: ${to}`);
    console.log(`Sending email from: ${this.fromEmail}`);

    try {
      await this.transporter.sendMail({
        from: `"Email Service" <${this.fromEmail}>`,
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

  async readInbox(): Promise<any[]> {
    try {
      this.logger.log('Connecting to IMAP server...');
      const connection = await imap.connect(this.imapConfig);
      this.logger.log('Connected to IMAP server...');
      await connection.openBox('INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: [''], markSeen: true };
      const messages = await connection.search(searchCriteria, fetchOptions);

      const emails: any[] = [];
      for (const message of messages) {
        const all = message.parts.find((part) => part.which === '');
        if (!all || !all.body) continue;

        const parsed: ParsedMail = await simpleParser(all.body);
        emails.push({
          subject: parsed.subject,
          from: parsed.from?.text,
          body: parsed.text || parsed.html,
        });
        this.logger.log(`Fetched email: ${parsed.subject}`);
      }

      await connection.end();

      if (emails.length > 0) {
        const pdfPath = await saveEmailsToPDF(emails);
        this.logger.log(`📄 Emails saved to PDF: ${pdfPath}`);
      }

      return emails;
    } catch (error) {
      this.logger.error('Error while reading emails', error.message);
      return [];
    }
  }
}
