const cron = require('node-cron');
const newsletterRunner = require('../services/newsletterRunner');
const config = require('../../config');
const logger = require('../utils/logger');

function start() {
  const schedule = config.newsletter.cronSchedule;
  logger.info(`Scheduling newsletter: "${schedule}"`);

  cron.schedule(schedule, async () => {
    logger.info('Cron triggered — running newsletter...');
    try {
      await newsletterRunner.run();
    } catch (err) {
      logger.error(`Newsletter run failed: ${err.message}`);
    }
  });
}

module.exports = { start };
