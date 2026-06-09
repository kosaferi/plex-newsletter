const express = require('express');
const path = require('path');
const fs = require('fs');
const newsletterRunner = require('../services/newsletterRunner');
const statsCollector = require('../services/statsCollector');
const tautulli = require('../api/tautulli');
const plex = require('../api/plex');
const mailer = require('../services/mailer');
const config = require('../../config');
const logger = require('../utils/logger');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONFIG_PATH = path.join(process.cwd(), '.env');

// ── Status ─────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    title: config.newsletter.title,
    cronSchedule: config.newsletter.cronSchedule,
    statsDays: config.newsletter.statsDays,
    smtpHost: config.smtp.host,
    smtpPort: config.smtp.port,
    smtpUser: config.smtp.auth.user,
    smtpFrom: config.smtp.from,
    plexUrl: config.plex.url,
    tautulliUrl: config.tautulli.url,
    adminEmail: config.admin.email,
  });
});

// ── Stats ──────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { global: g, recentlyAdded, newUsers, allUsers } = await statsCollector.collect();
    res.json({
      totalPlays: g.totalPlays,
      recentlyAdded: recentlyAdded.length,
      newUsers: newUsers.length,
      totalUsers: allUsers.length,
      topMovies: g.topMovies.slice(0, 5),
      topShows: g.topShows.slice(0, 5),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Live activity ──────────────────────────────────────────────────────────
app.get('/api/activity', async (req, res) => {
  try {
    const [sessions, activity] = await Promise.all([
      plex.getSessions(),
      tautulli.getActivity(),
    ]);
    res.json({ sessions, streamCount: activity?.stream_count || sessions.length });
  } catch (e) {
    res.status(500).json({ error: e.message, sessions: [], streamCount: 0 });
  }
});

// ── Users ──────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const users = await tautulli.getUsers();
    res.json(users.map(u => ({
      id: u.user_id,
      name: u.friendly_name || u.username,
      email: u.email || '',
      thumb: u.thumb,
      isActive: !!(u.email && u.email.trim()),
      lastSeen: u.last_seen,
      totalPlays: u.plays || 0,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Update user email (stored locally in users-override.json) ──────────────
const USER_OVERRIDES_PATH = path.join(process.cwd(), 'data', 'user-overrides.json');
function loadOverrides() {
  try {
    fs.mkdirSync(path.dirname(USER_OVERRIDES_PATH), { recursive: true });
    return JSON.parse(fs.readFileSync(USER_OVERRIDES_PATH, 'utf8'));
  } catch { return {}; }
}
function saveOverrides(data) {
  fs.mkdirSync(path.dirname(USER_OVERRIDES_PATH), { recursive: true });
  fs.writeFileSync(USER_OVERRIDES_PATH, JSON.stringify(data, null, 2));
}

app.post('/api/users/:id/email', (req, res) => {
  try {
    const overrides = loadOverrides();
    overrides[req.params.id] = { email: req.body.email };
    saveOverrides(overrides);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Preview ────────────────────────────────────────────────────────────────
app.get('/api/preview', async (req, res) => {
  try {
    const results = await newsletterRunner.run(true);
    const userId = req.query.userId;
    const found = userId
      ? results.find(r => String(r.userId) === String(userId))
      : results[0];
    if (!found) return res.status(404).json({ error: 'No eligible users with email found' });
    res.json({ html: found.html, user: found.user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Send ───────────────────────────────────────────────────────────────────
app.post('/api/send', async (req, res) => {
  const { userIds } = req.body;
  try {
    const results = await newsletterRunner.run(false, userIds || null);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Test connections ───────────────────────────────────────────────────────
app.get('/api/test/plex', async (req, res) => {
  res.json(await plex.testConnection());
});
app.get('/api/test/tautulli', async (req, res) => {
  res.json(await tautulli.testConnection());
});
app.get('/api/test/smtp', async (req, res) => {
  try {
    await mailer.verify();
    res.json({ ok: true, message: 'SMTP connection verified' });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// ── Send test email ────────────────────────────────────────────────────────
app.post('/api/test/email', async (req, res) => {
  const to = req.body.to || config.admin.email;
  if (!to) return res.status(400).json({ error: 'No recipient email' });
  try {
    await mailer.sendNewsletter({
      to,
      subject: 'Plex Newsletter — Test Email',
      html: `<div style="font-family:sans-serif;padding:40px;background:#0c0c14;color:#e8e2d5;border-radius:8px">
        <h2 style="color:#e6b450;font-family:Georgia">✅ Test Email</h2>
        <p style="margin-top:16px">Your Plex Newsletter SMTP configuration is working correctly.</p>
        <p style="color:rgba(232,226,213,0.5);font-size:13px;margin-top:12px">Sent from PlexMail at ${new Date().toLocaleString()}</p>
      </div>`,
    });
    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// ── Settings ───────────────────────────────────────────────────────────────
app.post('/api/settings', (req, res) => {
  try {
    const b = req.body;
    const existing = loadEnvFile();
    const merged = {
      ...existing,
      PLEX_URL: b.plexUrl || existing.PLEX_URL || '',
      PLEX_TOKEN: b.plexToken || existing.PLEX_TOKEN || '',
      TAUTULLI_URL: b.tautulliUrl || existing.TAUTULLI_URL || '',
      TAUTULLI_API_KEY: b.tautulliApiKey || existing.TAUTULLI_API_KEY || '',
      SMTP_HOST: b.smtpHost || existing.SMTP_HOST || '',
      SMTP_PORT: b.smtpPort || existing.SMTP_PORT || '587',
      SMTP_SECURE: b.smtpSecure !== undefined ? b.smtpSecure : (existing.SMTP_SECURE || 'false'),
      SMTP_USER: b.smtpUser || existing.SMTP_USER || '',
      SMTP_PASS: b.smtpPass || existing.SMTP_PASS || '',
      SMTP_FROM: b.smtpFrom || existing.SMTP_FROM || '',
      NEWSLETTER_TITLE: b.newsletterTitle || existing.NEWSLETTER_TITLE || 'Weekly Plex Digest',
      CRON_SCHEDULE: b.cronSchedule || existing.CRON_SCHEDULE || '0 9 * * 1',
      STATS_DAYS: b.statsDays || existing.STATS_DAYS || '7',
      ADMIN_EMAIL: b.adminEmail || existing.ADMIN_EMAIL || '',
      PREVIEW_PORT: existing.PREVIEW_PORT || '3000',
    };
    const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(CONFIG_PATH, lines.join('\n') + '\n');
    res.json({ ok: true, message: 'Settings saved. Restart the app to apply changes.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function loadEnvFile() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return Object.fromEntries(
      raw.split('\n')
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
    );
  } catch { return {}; }
}

// ── Recently added ─────────────────────────────────────────────────────────
app.get('/api/recently-added', async (req, res) => {
  try {
    const items = await plex.getRecentlyAdded(12);
    res.json(items.map(i => ({
      title: i.title,
      type: i.type,
      year: i.year,
      grandparentTitle: i.grandparentTitle,
      addedAt: i.addedAt,
      thumb: plex.thumbUrl(i.thumb),
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback to UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
