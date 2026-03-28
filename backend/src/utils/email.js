import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

/**
 * Sends booking confirmation if SMTP is configured; otherwise no-op.
 */
export async function sendAppointmentBookedEmail({ to, patientName, doctorName, date, time }) {
  const tx = getTransporter();
  if (!tx) {
    console.log('[email] SMTP not configured, skipping notification');
    return;
  }
  const from = process.env.EMAIL_FROM || 'noreply@example.com';
  const app = process.env.APP_NAME || 'Smart Doctor Appointment';
  await tx.sendMail({
    from,
    to,
    subject: `${app} — Appointment confirmed`,
    text: `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} is booked for ${date} at ${time}.\n\nThank you.`,
    html: `<p>Hi ${patientName},</p><p>Your appointment with <strong>Dr. ${doctorName}</strong> is booked for <strong>${date}</strong> at <strong>${time}</strong>.</p><p>Thank you.</p>`,
  });
}
