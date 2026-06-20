const express = require('express');
const router = express.Router();
const {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getChampionMastery,
  resolvePlatform,
} = require('../services/riotApi');

// GET /api/player/:gameName/:tagLine
// tagLine puede ser el tag real del Riot ID (ej: "LA1", "NA1", "KR1") o cualquier tag personalizado.
// Si es un tag de región reconocido (LA1, NA1, KR, EUW…) se resuelve la plataforma automáticamente.
// Si es un tag personalizado (ej: "ProPlayer"), se asume la plataforma por defecto (la1).
router.get('/:gameName/:tagLine', async (req, res) => {
  const { gameName, tagLine } = req.params;
  const platform = resolvePlatform(tagLine);

  try {
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;

    const summoner = await getSummonerByPuuid(puuid, platform);
    const entries = await getLeagueEntries(puuid, platform);
    const soloQ = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5');

    return res.json({
      puuid,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      gameName: account.gameName,
      tagLine: account.tagLine,
      platform,
      tier:   soloQ?.tier   ?? 'UNRANKED',
      rank:   soloQ?.rank   ?? '',
      lp:     soloQ?.leaguePoints ?? 0,
      wins:   soloQ?.wins   ?? 0,
      losses: soloQ?.losses ?? 0,
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited', retryAfter: err.retryAfter });
    }
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/mastery/:puuid/:championId?platform=la1
router.get('/mastery/:puuid/:championId', async (req, res) => {
  const { puuid, championId } = req.params;
  const platform = req.query.platform ?? 'la1';

  try {
    const mastery = await getChampionMastery(puuid, championId, platform);
    return res.json({
      championId:     mastery.championId,
      championLevel:  mastery.championLevel,
      championPoints: mastery.championPoints,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.json({ championId: Number(championId), championLevel: 0, championPoints: 0 });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited', retryAfter: err.retryAfter });
    }
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
