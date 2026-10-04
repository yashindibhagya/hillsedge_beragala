import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Sends mail if SMTP is configured, otherwise writes it to the log.
 *
 * The log fallback is what makes password reset usable in development, and
 * means a missing SMTP setting in production degrades to "ask a super admin
 * to set your password" rather than to an error.
 */
let transport = null;

export async function sendMail({ to, subject, text }) {
  if (!config.smtpUrl) {
    console.log(
      `[mail] (SMTP_URL not set — not sent)\n  to: ${to}\n  subject: ${subject}\n\n${text}\n`
    );
    return { logged: true };
  }
  transport ??= nodemailer.createTransport(config.smtpUrl);
  try {
    await transport.sendMail({ from: config.mailFrom, to, subject, text });
    return { sent: true };
  } catch (error) {
    // Mail is a side channel: a failure is logged, never surfaced to a guest.
    console.error(`[mail] could not send "${subject}" to ${to}:`, error.message);
    return { failed: true };
  }
}
