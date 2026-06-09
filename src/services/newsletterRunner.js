const statsCollector = require('./statsCollector');
const templateRenderer = require('./templateRenderer');
const mailer = require('./mailer');
const config = require('../../config');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

/**
 * Full newsletter run.
 * @param {boolean} preview - if true, returns HTML instead of sending
 * @param {string[]|null} filterUserIds - optional list of user IDs to restrict send to
 */
async function run(preview = false, filterUserIds = null) {
  logger.info('=== Newsletter run started ===');

  const { global, users, recentlyAdded, newUsers, allUsers } = await statsCollector.collect();

  let targets = users;
  if (filterUserIds && filterUserIds.length) {
    targets = users.filter(u => filterUserIds.includes(String(u.user.user_id)));
  }

  if (!preview) {
    try { await mailer.verify(); } catch (e) {
      logger.error(`SMTP verification failed: ${e.message}`);
      throw e;
    }
  }

  const subject = `${config.newsletter.title} — ${dayjs().format('D MMM YYYY')}`;
  const results = [];

  for (const userData of targets) {
    try {
      const html = templateRenderer.render(userData, global, recentlyAdded, newUsers, allUsers, config);

      if (preview) {
        results.push({
          userId: userData.user.user_id,
          user: userData.user.friendly_name || userData.user.username,
          html,
        });
      } else {
        await mailer.sendNewsletter({ to: userData.user.email, subject, html });
        results.push({ userId: userData.user.user_id, user: userData.user.friendly_name, status: 'sent' });
      }
    } catch (err) {
      logger.error(`Failed for ${userData.user.friendly_name}: ${err.message}`);
      results.push({ userId: userData.user.user_id, user: userData.user.friendly_name, status: 'failed', error: err.message });
    }
  }

  logger.info(`=== Run complete: ${results.length} processed ===`);
  return results;
}

module.exports = { run };
