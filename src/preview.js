/**
 * Preview server — renders the newsletter for the first eligible user
 * and serves it at http://localhost:PORT
 *
 * Run: node src/preview.js
 */
require('dotenv').config();
const express = require('express');
const newsletterRunner = require('./services/newsletterRunner');
const config = require('../config');
const logger = require('./utils/logger');

const app = express();
const PORT = config.preview.port;

app.get('/', async (req, res) => {
  try {
    logger.info('Generating preview...');
    const results = await newsletterRunner.run(true);
    if (!results.length) {
      return res.send('<h2>No users with email found on the server.</h2>');
    }
    // Show the first user's newsletter; use ?user=N to paginate
    const idx = Math.min(parseInt(req.query.user || '0'), results.length - 1);
    const { user, html } = results[idx];

    const nav = results
      .map((r, i) =>
        `<a href="?user=${i}" style="margin:0 6px;color:#e6b450;font-family:sans-serif;font-size:12px">${r.user}</a>`
      )
      .join('');

    res.send(`
      <div style="background:#222;padding:10px 20px;position:sticky;top:0;z-index:9999">
        ${nav}
      </div>
      ${html}
    `);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send(`<pre>${err.stack}</pre>`);
  }
});

app.listen(PORT, () => {
  logger.info(`Preview server running at http://localhost:${PORT}`);
});
