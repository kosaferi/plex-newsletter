const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../utils/logger');

let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    });
  }
  return _transporter;
}

async function verify() {
  await getTransporter().verify();
  logger.info('SMTP connection verified');
}

/**
 * Send a single personalised newsletter to one recipient.
 */
async function sendNewsletter({ to, subject, html }) {
  const info = await getTransporter().sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
  logger.info(`Email sent to ${to} — MessageId: ${info.messageId}`);
  return info;
}

module.exports = { verify, sendNewsletter };
