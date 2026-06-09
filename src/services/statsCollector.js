const tautulli = require('../api/tautulli');
const plex = require('../api/plex');
const config = require('../../config');
const logger = require('../utils/logger');

const DAYS = config.newsletter.statsDays;

/**
 * Collect all data needed for the newsletter.
 * Returns { global, users, recentlyAdded, newUsers }
 */
async function collect() {
  logger.info('Collecting stats...');

  const [
    homeStats,
    tautulliRecent,
    plexRecent,
    newUsers,
    allUsers,
    playsByDate,
    serverInfo,
  ] = await Promise.all([
    tautulli.getHomeStats(DAYS),
    tautulli.getRecentlyAdded(20),
    plex.getRecentlyAdded(20),
    tautulli.getNewUsers(DAYS),
    tautulli.getUsers(),
    tautulli.getPlaysByDate(DAYS),
    plex.getServerInfo(),
  ]);

  // Merge recently added: prefer Tautulli (has play counts), fall back to Plex
  const recentlyAdded = _mergeRecentlyAdded(tautulliRecent, plexRecent);

  // Build per-user data (only users with email)
  const eligibleUsers = allUsers.filter((u) => u.email && u.email !== '');
  const usersData = await _collectPerUser(eligibleUsers, allUsers);

  const global = {
    homeStats,
    playsByDate,
    serverInfo,
    totalPlays: _sumPlays(homeStats),
    topMovies: _extractStat(homeStats, 'top_movies'),
    topShows: _extractStat(homeStats, 'top_tv'),
    topUsers: _extractStat(homeStats, 'top_users'),
    periodDays: DAYS,
  };

  logger.info(`Collected stats for ${usersData.length} users, ${recentlyAdded.length} new items`);

  return { global, users: usersData, recentlyAdded, newUsers, allUsers };
}

async function _collectPerUser(eligibleUsers, allUsers) {
  const results = [];
  for (const user of eligibleUsers) {
    try {
      const [history, stats] = await Promise.all([
        tautulli.getUserWatchHistory(user.user_id, DAYS),
        tautulli.getUserStats(user.user_id),
      ]);

      const watchedItems = history.data || [];
      const totalMinutes = watchedItems.reduce(
        (sum, item) => sum + Math.round((item.duration || 0) / 60),
        0
      );
      const rank = _calcRank(user.user_id, allUsers, watchedItems);

      results.push({
        user,
        watchedItems: watchedItems.slice(0, 10),
        totalWatched: watchedItems.length,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60),
        stats,
        rank,
        totalUsers: allUsers.length,
        favoriteGenre: _favoriteGenre(watchedItems),
        streakDays: _watchStreak(watchedItems),
        mostWatchedShow: _mostWatchedShow(watchedItems),
      });
    } catch (err) {
      logger.warn(`Skipping user ${user.friendly_name}: ${err.message}`);
    }
  }
  return results;
}

function _mergeRecentlyAdded(tautulliItems, plexItems) {
  // tautulliItems from get_recently_added returns { recently_added: [...] }
  const tt = (tautulliItems.recently_added || []).map((i) => ({
    title: i.title,
    year: i.year,
    type: i.media_type,
    thumb: i.thumb,
    grandparentTitle: i.grandparent_title,
    addedAt: i.added_at,
    rating: i.rating,
    summary: i.summary,
  }));

  if (tt.length > 0) return tt.slice(0, 15);

  // Fallback to Plex direct
  return plexItems.slice(0, 15).map((i) => ({
    title: i.title,
    year: i.year,
    type: i.type,
    thumb: i.thumb,
    grandparentTitle: i.grandparentTitle,
    addedAt: i.addedAt,
    rating: i.rating,
    summary: i.summary,
  }));
}

function _extractStat(homeStats, statId) {
  if (!Array.isArray(homeStats)) return [];
  const stat = homeStats.find((s) => s.stat_id === statId);
  return stat ? stat.rows || [] : [];
}

function _sumPlays(homeStats) {
  if (!Array.isArray(homeStats)) return 0;
  const stat = homeStats.find((s) => s.stat_id === 'top_users');
  if (!stat) return 0;
  return (stat.rows || []).reduce((s, r) => s + (r.total_plays || 0), 0);
}

function _calcRank(userId, allUsers, watchedItems) {
  // Simple rank: position among all users sorted by play count descending
  // We don't have play counts for all here, so we return position in top_users list
  return null; // resolved later when global homeStats available
}

function _favoriteGenre(items) {
  const genres = {};
  for (const item of items) {
    if (item.genres) {
      for (const g of item.genres.split(',')) {
        const trimmed = g.trim();
        genres[trimmed] = (genres[trimmed] || 0) + 1;
      }
    }
  }
  return Object.entries(genres).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function _watchStreak(items) {
  if (!items.length) return 0;
  const days = new Set(
    items.map((i) => new Date(i.started * 1000).toDateString())
  );
  return days.size;
}

function _mostWatchedShow(items) {
  const shows = {};
  for (const item of items) {
    if (item.media_type === 'episode' && item.grandparent_title) {
      shows[item.grandparent_title] = (shows[item.grandparent_title] || 0) + 1;
    }
  }
  const sorted = Object.entries(shows).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? { title: sorted[0][0], episodes: sorted[0][1] } : null;
}

module.exports = { collect };
