const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

Handlebars.registerHelper('add', (a, b) => a + b);

Handlebars.registerHelper('formatDate', (epoch) => {
  if (!epoch) return '';
  return dayjs.unix(epoch).format('ddd D MMM');
});

Handlebars.registerHelper('formatMins', (seconds) => {
  if (!seconds) return '';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
});

Handlebars.registerHelper('truncate', (str, len) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
});

// ── Load template ─────────────────────────────────────────────────────────────

const TEMPLATE_PATH = path.join(__dirname, '../templates/newsletter.hbs');
const source = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const template = Handlebars.compile(source);

// ── Rank helpers ──────────────────────────────────────────────────────────────

function calcRank(userId, topUsers) {
  const idx = topUsers.findIndex(
    (u) => String(u.user_id) === String(userId)
  );
  return idx >= 0 ? idx + 1 : null;
}

function rankTitle(rank, total) {
  if (!rank) return 'Unranked';
  const pct = rank / total;
  if (rank === 1) return '🏆 Top Watcher — Crown of the Server';
  if (pct <= 0.1) return '⭐ Top 10% — Dedicated Viewer';
  if (pct <= 0.25) return '🎬 Top 25% — Avid Fan';
  if (pct <= 0.5) return '📺 Top Half — Regular Viewer';
  return '🌱 Casual Watcher — Room to Grow';
}

function watchComment(hours) {
  if (hours >= 20) return "you've been absolutely glued to the screen. Legendary.";
  if (hours >= 10) return "a solid week of streaming. Well done.";
  if (hours >= 5) return "a respectable watch week!";
  if (hours >= 1) return "a light week — more to explore!";
  return "quiet week, but the queue is always waiting.";
}

// ── Render ────────────────────────────────────────────────────────────────────

function render(userData, globalData, recentlyAdded, newUsers, allUsers, config) {
  const { user, watchedItems, totalWatched, totalHours, streakDays,
          favoriteGenre, mostWatchedShow } = userData;

  const topUsers = globalData.topUsers || [];
  const userRank = calcRank(user.user_id, topUsers);

  const periodLabel = `${dayjs().subtract(config.newsletter.statsDays, 'day').format('D MMM')} – ${dayjs().format('D MMM YYYY')}`;

  const context = {
    newsletterTitle: config.newsletter.title,
    serverName: globalData.serverInfo?.friendlyName || 'Plex Server',
    periodLabel,
    userName: user.friendly_name || user.username,
    totalWatched,
    totalHours,
    streakDays,
    favoriteGenre,
    mostWatchedShow,
    watchComment: watchComment(totalHours),
    watchedItems,
    userRank,
    totalUsers: allUsers.length,
    rankTitle: rankTitle(userRank, allUsers.length),
    global: {
      topMovies: globalData.topMovies.slice(0, 5),
      topShows: globalData.topShows.slice(0, 5),
      totalPlays: globalData.totalPlays,
    },
    recentlyAdded: recentlyAdded.slice(0, 8),
    recentlyAddedCount: recentlyAdded.length,
    newUsers,
    newUsersCount: newUsers.length,
  };

  return template(context);
}

module.exports = { render };
