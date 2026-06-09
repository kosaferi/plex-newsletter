require('dotenv').config();

module.exports = {
  plex: {
    url: process.env.PLEX_URL,
    token: process.env.PLEX_TOKEN,
  },
  tautulli: {
    url: process.env.TAUTULLI_URL,
    apiKey: process.env.TAUTULLI_API_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM,
  },
  newsletter: {
    title: process.env.NEWSLETTER_TITLE || 'Weekly Plex Digest',
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * 1',
    statsDays: parseInt(process.env.STATS_DAYS || '7'),
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
  },
  preview: {
    port: parseInt(process.env.PREVIEW_PORT || '3000'),
  },
};
