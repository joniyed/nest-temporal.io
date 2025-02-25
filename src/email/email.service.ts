import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";
import * as imap from "imap-simple";
import { ParsedMail, simpleParser } from "mailparser";
import { saveEmailsToMSG } from "./msg.service";

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;

  private readonly imapConfig = {
    imap: {
      user: this.configService.get<string>("SMTP_USERNAME"),
      password: this.configService.get<string>("SMTP_PASSWORD"),
      host: this.configService.get<string>("SMTP_HOST"),
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.fromEmail = this.configService.get<string>(
      "SMTP_SENDER_EMAIL",
      "no-reply@example.com",
    );
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>("SMTP_USERNAME"),
        pass: this.configService.get<string>("SMTP_PASSWORD"),
      },
    });

    try {
      this.logger.log("Trying to SMTP connection establish");
      await this.transporter.verify();
      this.logger.log("SMTP connection established successfully");
    } catch (error) {
      this.logger.error("Failed to establish SMTP connection", error.stack);
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
        subject: "Your Subject",
        text: "Email content",
        html: "<b>Email content</b>",
      });
      this.logger.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  async readInbox(): Promise<any[]> {
    try {
      this.logger.log("Connecting to IMAP server...");
      const connection = await imap.connect(this.imapConfig);
      this.logger.log("Connected to IMAP server...");

      const folders = ["INBOX"];
      const allEmails: any[] = [];

      for (const folder of folders) {
        this.logger.log(`Opening folder: ${folder}`);
        await connection.openBox(folder);
        const searchCriteria = ["UNSEEN"];
        const fetchOptions = { bodies: [""], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const message of messages) {
          const all = message.parts.find((part) => part.which === "");
          if (!all || !all.body) continue;

          const parsed: ParsedMail = await simpleParser(all.body);

          // Extract attachments from parsed email
          const attachments =
            parsed.attachments?.map((attachment) => ({
              filename: attachment.filename || "unnamed_attachment",
              content: attachment.content, // Buffer containing attachment data
            })) || [];

          allEmails.push({
            folder,
            from: parsed.from?.value,
            to: parsed.to?.value,
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
            subject: parsed.subject,
            date: parsed.date,
            body: parsed.text,
            attachments,
          });
        }
      }

      // No change to readInbox up to this point; just pass to buildEmailThreads

      if (allEmails.length > 0) {
        await saveEmailsToMSG(allEmails);
      }

      return allEmails;
    } catch (error) {
      this.logger.error("Error while reading emails", error.message);
      return null;
    }
  }
}
