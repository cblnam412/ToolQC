const { getDb } = require('../database');
const { generateId } = require('../utils/helpers');

/**
 * POST /api/projects/:projectId/links
 * Body: { name, url }
 */
async function createLink(req, res) {
    try {
        const { projectId } = req.params;
        const { name, url } = req.body;
        if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

        const db = await getDb();
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const id = generateId();
        await db.run(
            'INSERT INTO links (id, project_id, name, url) VALUES (?, ?, ?, ?)',
            [id, projectId, name, url]
        );

        res.status(201).json({ id, project_id: projectId, name, url });
    } catch (err) {
        console.error('[linkController.createLink]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * DELETE /api/projects/:projectId/links/:linkId
 */
async function deleteLink(req, res) {
    try {
        const { linkId } = req.params;
        const db = await getDb();
        const result = await db.run('DELETE FROM links WHERE id = ?', [linkId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Link not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[linkController.deleteLink]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createLink, deleteLink };
