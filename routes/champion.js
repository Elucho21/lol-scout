const express = require('express');
const router = express.Router();
const { getChampionStats } = require('../services/lolalytics');

// GET /api/champion/:championName
router.get('/:championName', async (req, res) => {
  const { championName } = req.params;

  try {
    const stats = await getChampionStats(championName);
    return res.json(stats);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
