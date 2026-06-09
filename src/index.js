require('dotenv').config();
const cronScheduler = require('./scheduler/cron');
const newsletterRunner = require('./services/newsletterRunner');
const webServer = require('./webui/server');
const config = require('../config');
const logger = require('./utils/logger');

const SEND_NOW = process.argv.includes('--send-now');
const NO_UI = process.argv.includes('--no-ui');

(async () => {
  if (SEND_NOW) {
    logger.info('--send-now flag: running immediately...');
    await newsletterRunner.run();
    process.exit(0);
  }

  if (!NO_UI) {
    const port = config.preview.port;
    webServer.listen(port, () => {
      logger.info(`Web UI running at http://localhost:${port}`);
    });
  }

  logger.info('Starting cron scheduler...');
  cronScheduler.start();
  logger.info('Plex Newsletter daemon ready.');
})();
