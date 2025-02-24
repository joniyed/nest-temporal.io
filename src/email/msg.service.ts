import * as fs from "fs-extra";
import * as path from "path";
import { TextEncoder } from "util";

// Assuming emailThreads is a Record<string, any[]> from buildEmailThreads
const saveEmailsToMSG = async (
  emailThreads: Record<string, any[]>,
): Promise<string> => {
  for (const [rootMessageId, emails] of Object.entries(emailThreads)) {
    // ✅ Folder name is the root messageId (original message key)
    const folderName = rootMessageId.replace(/[<>]/g, ""); // Remove < and > for valid folder name
    const dirPath = path.join(__dirname, "..", "static", "msg", folderName);
    await fs.ensureDir(dirPath);

    // 📄 Process each email in the thread (root + replies)
    for (const email of emails) {
      const from = email.from?.[0]?.address || "Unknown";
      const subject = email.subject || "No Subject";
      const body = email.body || "No Content";

      // Prepare email content with left-aligned text
      const msgContent = `From: ${from}\nSubject: ${subject}\nBody: ${body}`;

      const encoder = new TextEncoder();
      const buffer = encoder.encode(msgContent);

      // 📁 Save as .msg file with a timestamp to avoid overwriting
      const fileName = `${subject.replace(/[^a-z0-9]/gi, "_")}_${new Date(email.date).getTime()}.msg`;
      const filePath = path.join(dirPath, fileName);

      await fs.writeFile(filePath, buffer);
    }
  }

  return "Emails saved successfully in respective folders.";
};

export { saveEmailsToMSG };
