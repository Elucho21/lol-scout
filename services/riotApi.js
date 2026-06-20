const axios = require('axios');

const RIOT_KEY = process.env.RIOT_API_KEY;
const riotHeaders = { 'X-Riot-Token': RIOT_KEY };

// Mapeo tagLine → cluster regional para account-v1 y plataforma para summoner/league
const TAG_TO_CLUSTER = {
  NA1: 'americas', NA: 'americas',
  LAN: 'americas', LA1: 'americas',
  LAS: 'americas', LA2: 'americas',
  BR1: 'americas', BR: 'americas',
  EUW1: 'europe',  EUW: 'europe',
  EUN1: 'europe',  EUNE: 'europe',
  TR1:  'europe',  TR: 'europe',
  RU:   'europe',
  KR:   'asia',    KR1: 'asia',
  JP1:  'asia',    JP: 'asia',
};

const TAG_TO_PLATFORM = {
  NA1: 'na1',  NA: 'na1',
  LAN: 'la1',  LA1: 'la1',
  LAS: 'la2',  LA2: 'la2',
  BR1: 'br1',  BR: 'br1',
  EUW1: 'euw1', EUW: 'euw1',
  EUN1: 'eune1', EUNE: 'eune1',
  TR1: 'tr1',  TR: 'tr1',
  RU:  'ru',
  KR:  'kr',   KR1: 'kr',
  JP1: 'jp1',  JP: 'jp1',
};

// tagLine puede ser el tag exacto del Riot ID o un identificador de región
function resolveCluster(tagLine) {
  const key = tagLine.toUpperCase();
  return TAG_TO_CLUSTER[key] ?? 'americas';
}

function resolvePlatform(tagLine) {
  const key = tagLine.toUpperCase();
  return TAG_TO_PLATFORM[key] ?? 'la1';
}

async function riotGet(url) {
  try {
    const res = await axios.get(url, { headers: riotHeaders });
    return res.data;
  } catch (err) {
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers['retry-after'] || 1;
      const error = new Error('Rate limited by Riot API');
      error.status = 429;
      error.retryAfter = retryAfter;
      throw error;
    }
    if (err.response?.status === 404) {
      const error = new Error('Resource not found');
      error.status = 404;
      throw error;
    }
    const error = new Error(err.response?.data?.status?.message || 'Riot API error');
    error.status = err.response?.status || 500;
    throw error;
  }
}

// account-v1: usa el cluster correcto según el tagLine
async function getAccountByRiotId(gameName, tagLine) {
  const cluster = resolveCluster(tagLine);
  const url = `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotGet(url);
}

// summoner-v4: usa la plataforma correcta
async function getSummonerByPuuid(puuid, platform = 'la1') {
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotGet(url);
}

// league-v4 — Riot removió summonerId de summoner-v4, ahora se consulta por PUUID
async function getLeagueEntries(puuid, platform = 'la1') {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  return riotGet(url);
}

// champion-mastery-v4
async function getChampionMastery(puuid, championId, platform = 'la1') {
  const url = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/by-champion/${championId}`;
  return riotGet(url);
}

module.exports = {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getChampionMastery,
  resolvePlatform,
};
