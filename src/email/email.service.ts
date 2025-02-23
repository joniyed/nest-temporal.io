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
      const fetchOptions = { bodies: [''], markSeen: false };
      const messages = await connection.search(searchCriteria, fetchOptions);

      const emails: any[] = [];
      const threads: { [threadId: string]: any[] } = {}; // To track thread replies

      for (const message of messages) {
        const all = message.parts.find((part) => part.which === '');
        if (!all || !all.body) continue;

        const parsed: ParsedMail = await simpleParser(all.body);
        const threadId = parsed.headers.get('in-reply-to') || parsed.headers.get('references') || parsed.messageId;

        // If threadId is missing, treat as a new thread
        if (!threadId) {
          this.logger.log(`Fetched new email: ${parsed.subject}`);
          emails.push({
            subject: parsed.subject,
            from: parsed.from?.text,
            body: parsed.text || parsed.html,
            threadId: parsed.messageId,
          });
        } else {
          // If it's a reply, add it to the existing thread
          if (!threads[threadId]) {
            threads[threadId] = [];
          }
          threads[threadId].push({
            subject: parsed.subject,
            from: parsed.from?.text,
            body: parsed.text || parsed.html,
          });
          this.logger.log(`Fetched reply in thread: ${parsed.subject}`);
        }
      }

      // Merge the thread replies back into the main emails list
      for (const threadId in threads) {
        const threadEmails = threads[threadId];
        // You could also decide to group or display the thread differently here.
        emails.push(...threadEmails);
      }

      await connection.end();

      if (emails.length > 0) {
        const pdfPath = await saveEmailsToPDF(emails);
        this.logger.log(`📄 ${emails.length} Emails saved to PDF: ${pdfPath}`);
      }

      return emails;
    } catch (error) {
      this.logger.error('Error while reading emails', error.message);
      return [];
    }
  }

}
