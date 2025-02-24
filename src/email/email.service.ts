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
      host: "imap.gmail.com",
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

  async readInbox(): Promise<Record<string, any[]>> {
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

          allEmails.push({
            folder,
            from: parsed.from?.value,
            to: parsed.to?.value,
            messageId: parsed.messageId,
            inReplyTo: parsed.headers.get("In-Reply-To") || null,
            references: parsed.headers.get("References") || null,
            subject: parsed.subject,
            date: parsed.date,
            body: parsed.text,
          });
        }
      }

      // No change to readInbox up to this point; just pass to buildEmailThreads
      const emailThreads = this.buildEmailThreads(allEmails);

      if (emailThreads) {
        const result = await saveEmailsToMSG(emailThreads);
        console.log(result);
      } else {
        console.log("Failed to read emails.");
      }

      return emailThreads;
    } catch (error) {
      this.logger.error("Error while reading emails", error.message);
      return null;
    }
  }

  private buildEmailThreads(emails: any[]): Record<string, any[]> {
    const threads: Record<string, any[]> = {};

    // Step 1: Group emails by cleaned subject (ignoring Re:/Fwd:)
    const subjectGroups = new Map<string, any[]>();
    emails.forEach((email) => {
      const cleanSubject =
        email.subject?.replace(/^(Re:|Fwd:)\s*/i, "").trim() || "";
      if (!subjectGroups.has(cleanSubject)) {
        subjectGroups.set(cleanSubject, []);
      }
      subjectGroups.get(cleanSubject)!.push(email);
    });

    // Step 2: For each subject group, determine the root and build the thread
    subjectGroups.forEach((group) => {
      // Sort by date to find the earliest email as the root
      group.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // The root is the earliest email in the group
      const rootEmail = group[0];
      const rootMessageId = rootEmail.messageId;

      // Assign the entire group (including root) to the thread
      threads[rootMessageId] = group;
    });

    // Step 3: If inReplyTo/references were available, refine further (optional)
    // For your data, this isn’t needed since they’re all null, but keeping it for robustness
    emails.forEach((email) => {
      if (email.inReplyTo && threads[email.inReplyTo]) {
        // If email replies to a known root, ensure it’s in that thread
        if (!threads[email.inReplyTo].includes(email)) {
          threads[email.inReplyTo].push(email);
        }
        // Remove from its own thread if it was incorrectly set as a root
        if (threads[email.messageId] && email.messageId !== email.inReplyTo) {
          delete threads[email.messageId];
        }
      }
    });

    return threads;
  }

  // Optional: Keep this method for future use with inReplyTo/references
  private findRootEmailId(
    email: any,
    emailMap: Map<string, any>,
    allEmails: any[],
  ): string {
    if (email.inReplyTo && emailMap.has(email.inReplyTo)) {
      return email.inReplyTo;
    }

    if (email.references) {
      const refIds = email.references.split(" ");
      for (const refId of refIds) {
        if (emailMap.has(refId)) {
          return refId;
        }
      }
    }

    const cleanSubject = email.subject?.replace(/^(Re:|Fwd:)\s*/i, "").trim();
    for (const otherEmail of allEmails) {
      if (
        otherEmail.messageId !== email.messageId &&
        otherEmail.subject?.replace(/^(Re:|Fwd:)\s*/i, "").trim() ===
          cleanSubject &&
        new Date(otherEmail.date) < new Date(email.date)
      ) {
        return otherEmail.messageId;
      }
    }

    return email.messageId;
  }
}
