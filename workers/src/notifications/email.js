import nodemailer from 'nodemailer';
import { resolvePublicTarget } from '../monitoring/check.js';
import { unseal } from '@servicetrident/shared/integrations/secrets';

/** Send plain-text email through the same pinned, verified SMTP connection for all mail jobs. */
export async function sendEmail(integration, { to, subject, text, id }) {
  const secret = integration.secret ? unseal(integration.secret) : {};
  const smtp = secret.smtp || {
    host: process.env.SMTP_HOST,
    from: process.env.SMTP_FROM,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  };
  const { host, from, port } = smtp;
  if (!host || !from || ![465, 587].includes(port))
    throw new Error('Configure an email integration before sending.');
  let dnsDeadline;
  let target;
  try {
    target = await Promise.race([
      resolvePublicTarget(new URL(`https://${host}`)),
      new Promise((_, reject) => {
        dnsDeadline = setTimeout(() => reject(new Error('SMTP DNS timed out.')), 5000);
      }),
    ]);
  } finally {
    clearTimeout(dnsDeadline);
  }
  const transporter = nodemailer.createTransport({
    host: target.address,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { servername: host, rejectUnauthorized: true },
  });
  let deadline;
  try {
    if (!to.length) throw new Error('No active on-call recipient or fallback recipient.');
    const result = await Promise.race([
      transporter.sendMail({
        from,
        to,
        subject,
        text,
        messageId: `<${id}@servicetrident.local>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
      new Promise((_, reject) => {
        deadline = setTimeout(() => {
          transporter.close();
          reject(new Error('SMTP timed out.'));
        }, 20000);
      }),
    ]);
    if (result.rejected?.length) throw new Error('SMTP rejected one or more recipients.');
    return {};
  } finally {
    clearTimeout(deadline);
    transporter.close();
  }
}
