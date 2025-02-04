import * as PDFDocument from 'pdfkit';
import * as fs from 'fs-extra';
import * as path from 'path';

const saveEmailsToPDF = async (parsedEmails: { from: string; subject: string; body: string }[]): Promise<string> => {
  const dirPath = path.join(__dirname, '..', 'static', 'pdf');
  await fs.ensureDir(dirPath);

  const filePath = path.join(dirPath, `emails-${Date.now()}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    parsedEmails.forEach((email, index) => {
      doc.fontSize(14).text(`From: ${email.from || 'Unknown'}`, { bold: true });
      doc.fontSize(14).text(`Subject: ${email.subject || 'No Subject'}`);
      doc.moveDown();
      doc.fontSize(12).text('Body:', { bold: true });
      doc.fontSize(10).text(email.body || 'No Content');

      if (index < parsedEmails.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

export { saveEmailsToPDF };
