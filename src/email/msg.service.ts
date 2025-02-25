import * as fs from "fs-extra";
import * as path from "path";
import { TextEncoder } from "util";

// Interface for an attachment
interface Attachment {
  filename: string; // Name of the attachment file
  content: Buffer | string; // Binary data or string content of the attachment
}

// Interface to define the email structure with attachments
interface Email {
  folder: string;
  from: { address: string; name: string }[];
  to: { address: string; name: string }[];
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  subject: string;
  date: string;
  body: string;
  attachments?: Attachment[]; // Optional array of attachments
}

// Helper function to build email threads based on references
const buildEmailThreads = (emails: Email[]): Record<string, Email[]> => {
  const threads: Record<string, Email[]> = {};
  const emailMap: Record<string, Email> = {};

  // Map all emails by their messageId
  for (const email of emails) {
    emailMap[email.messageId] = email;
  }

  // Group emails into threads based on references
  for (const email of emails) {
    let rootId = email.messageId; // Default to self if no references

    // Check references to find the root email
    if (email.references && email.references.length > 0) {
      // Look for the earliest referenced email that exists in the dataset
      for (const refId of email.references) {
        if (emailMap[refId]) {
          rootId = refId; // Use the first valid reference as the root
          break;
        }
      }
    }

    // Initialize thread if it doesn't exist
    if (!threads[rootId]) {
      threads[rootId] = [];
    }

    // Add email to its thread
    threads[rootId].push(email);
  }

  return threads;
};

// Main function to save emails and attachments
const saveEmailsToMSG = async (emails: Email[]): Promise<string> => {
  const emailThreads = buildEmailThreads(emails);

  for (const [rootMessageId, threadEmails] of Object.entries(emailThreads)) {
    // Clean the rootMessageId for a valid folder name
    const folderName = rootMessageId.replace(/[<>]/g, "");
    const dirPath = path.join(__dirname, "..", "static", "msg", folderName);
    await fs.ensureDir(dirPath);

    // Process each email in the thread
    for (const email of threadEmails) {
      const from = email.from?.[0]?.address || "Unknown";
      const subject = email.subject || "No Subject";
      const body = email.body || "No Content";

      // Prepare email content
      const msgContent = `From: ${from}\nSubject: ${subject}\nBody: ${body}`;

      const encoder = new TextEncoder();
      const buffer = encoder.encode(msgContent);

      // Generate a unique filename for the email
      const timestamp = new Date(email.date).getTime();
      const emailFileName = `${subject.replace(/[^a-z0-9]/gi, "_")}_${timestamp}.msg`;
      const emailFilePath = path.join(dirPath, emailFileName);

      // Save the email .msg file
      await fs.writeFile(emailFilePath, buffer);

      // Save attachments if they exist
      if (email.attachments && email.attachments.length > 0) {
        for (const attachment of email.attachments) {
          const attachmentFileName = `${timestamp}_${attachment.filename.replace(/[^a-z0-9.]/gi, "_")}`;
          const attachmentFilePath = path.join(dirPath, attachmentFileName);

          // Write attachment content to disk (assuming content is Buffer or string)
          await fs.writeFile(attachmentFilePath, attachment.content);
        }
      }
    }
  }

  return "Emails and attachments saved successfully in respective root folders.";
};

export { saveEmailsToMSG };
