// Email sender - mock implementation, ready for Resend API
// To enable: npm install resend, set RESEND_API_KEY env var

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from_name?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const senderName = options.from_name || "Notifikace";
  // TODO: Replace with Resend API when ready
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: `${senderName} <noreply@finadvisor.cz>`, to: options.to, subject: options.subject, html: options.html });

  console.log(`[EMAIL MOCK] From: ${senderName}`);
  console.log(`[EMAIL MOCK] To: ${options.to}`);
  console.log(`[EMAIL MOCK] Subject: ${options.subject}`);
  console.log(`[EMAIL MOCK] Body length: ${options.html.length} chars`);
  return true;
}
