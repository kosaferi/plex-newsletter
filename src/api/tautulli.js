const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');

const BASE = config.tautulli.url;
const KEY = config.tautulli.apiKey;

async function call(cmd, params = {}) {
  const { data } = await axios.get(`${BASE}/api/v2`, {
    params: { apikey: KEY, cmd, ...params },
    timeout: 10000,
  });
  if (data.response.result !== 'success') {
    throw new Error(`Tautulli error for ${cmd}: ${data.response.message}`);
  }
  return data.response.data;
}

async function getUsers() { return call('get_users'); }
async function getHomeStats(days) { return call('get_home_stats', { time_range: days, stats_count: 10 }); }
async function getUserWatchHistory(userId, days) {
  return call('get_history', { user_id: userId, length: 100, after: _daysAgoEpoch(days) });
}
async function getUserStats(userId) { return call('get_user_player_stats', { user_id: userId }); }
async function getRecentlyAdded(count = 20) { return call('get_recently_added', { count }); }
async function getPlaysByDate(days) { return call('get_plays_by_date', { time_range: days }); }
async function getActivity() { return call('get_activity'); }

async function getNewUsers(days) {
  const users = await getUsers();
  const cutoff = Date.now() / 1000 - days * 86400;
  return users.filter(u => u.created_at && Number(u.created_at) >= cutoff);
}

// Test connectivity — returns { ok, message }
async function testConnection() {
  try {
    await call('get_server_info');
    return { ok: true, message: 'Connected to Tautulli' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function _daysAgoEpoch(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return Math.floor(d.getTime() / 1000);
}

module.exports = {
  getUsers, getHomeStats, getUserWatchHistory, getUserStats,
  getRecentlyAdded, getPlaysByDate, getActivity, getNewUsers, testConnection,
};
