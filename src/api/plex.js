const axios = require('axios');
const config = require('../../config');

const client = axios.create({
  baseURL: config.plex.url,
  headers: { 'X-Plex-Token': config.plex.token, Accept: 'application/json' },
  timeout: 10000,
});

async function getRecentlyAdded(limit = 20) {
  const { data } = await client.get('/library/recentlyAdded', {
    params: { 'X-Plex-Container-Size': limit },
  });
  return data.MediaContainer?.Metadata || [];
}

async function getLibraries() {
  const { data } = await client.get('/library/sections');
  return data.MediaContainer?.Directory || [];
}

async function getOnDeck(limit = 10) {
  const { data } = await client.get('/library/onDeck', {
    params: { 'X-Plex-Container-Size': limit },
  });
  return data.MediaContainer?.Metadata || [];
}

async function getServerInfo() {
  const { data } = await client.get('/');
  return data.MediaContainer || {};
}

async function getSessions() {
  const { data } = await client.get('/status/sessions');
  return data.MediaContainer?.Metadata || [];
}

// Test connectivity — returns { ok, message }
async function testConnection() {
  try {
    const info = await getServerInfo();
    return { ok: true, message: `Connected: ${info.friendlyName || 'Plex Server'}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function thumbUrl(thumb) {
  if (!thumb) return null;
  return `${config.plex.url}${thumb}?X-Plex-Token=${config.plex.token}`;
}

module.exports = { getRecentlyAdded, getLibraries, getOnDeck, getServerInfo, getSessions, testConnection, thumbUrl };
