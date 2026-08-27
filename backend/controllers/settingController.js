const { getDb } = require('../database');

const VALID_KEYS = [
    'graphNodeImages',
    'graphNodeChildCounts',
    'graphEdgeNames',
    'graphSubNodeNames',
];

/**
 * GET /api/settings
 * Returns all settings as a flat object: { graphNodeImages: {}, ... }
 */
async function getSettings(req, res) {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(r => {
            try { settings[r.key] = JSON.parse(r.value); }
            catch { settings[r.key] = r.value; }
        });

        // Ensure all keys exist with defaults
        VALID_KEYS.forEach(k => {
            if (settings[k] === undefined) settings[k] = {};
        });

        res.json(settings);
    } catch (err) {
        console.error('[settingController.getSettings]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/settings
 * Body: { graphNodeImages?, graphNodeChildCounts?, graphEdgeNames?, graphSubNodeNames? }
 * Updates only the keys provided.
 */
async function updateSettings(req, res) {
    try {
        const db = await getDb();
        const updates = req.body;

        const stmt = await db.prepare(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        );

        for (const key of VALID_KEYS) {
            if (updates[key] !== undefined) {
                await stmt.run([key, JSON.stringify(updates[key])]);
            }
        }

        await stmt.finalize();
        res.json({ success: true });
    } catch (err) {
        console.error('[settingController.updateSettings]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getSettings, updateSettings };
