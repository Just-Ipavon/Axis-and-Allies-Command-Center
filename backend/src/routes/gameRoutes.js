const express = require('express');
const router = express.Router();
const db = require('../models');

// API to get list of all rooms
router.get('/', async (req, res) => {
    try {
        const games = await db.getGamesList();
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.verifyMasterPassword(req.params.id, req.body.password);
        await db.deleteGame(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(403).json({ error: err.message });
    }
});

module.exports = router;
