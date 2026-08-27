const { getDb } = require('../database');
const { generateId } = require('../utils/helpers');

/**
 * POST /api/projects/:projectId/notes
 * Body: { title, content, color }
 */
async function createNote(req, res) {
    try {
        const { projectId } = req.params;
        const { title, content = '', color = 'yellow' } = req.body;
        if (!title) return res.status(400).json({ error: 'title is required' });

        const db = await getDb();
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const id = generateId();
        await db.run(
            'INSERT INTO notes (id, project_id, title, content, color) VALUES (?, ?, ?, ?, ?)',
            [id, projectId, title, content, color]
        );

        res.status(201).json({ id, project_id: projectId, title, content, color });
    } catch (err) {
        console.error('[noteController.createNote]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/projects/:projectId/notes/:noteId
 * Body: { title?, content?, color? }
 */
async function updateNote(req, res) {
    try {
        const { noteId } = req.params;
        const db = await getDb();
        const existing = await db.get('SELECT * FROM notes WHERE id = ?', [noteId]);
        if (!existing) return res.status(404).json({ error: 'Note not found' });

        const title   = req.body.title   ?? existing.title;
        const content = req.body.content ?? existing.content;
        const color   = req.body.color   ?? existing.color;

        await db.run(
            'UPDATE notes SET title = ?, content = ?, color = ? WHERE id = ?',
            [title, content, color, noteId]
        );

        res.json({ ...existing, title, content, color });
    } catch (err) {
        console.error('[noteController.updateNote]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * DELETE /api/projects/:projectId/notes/:noteId
 */
async function deleteNote(req, res) {
    try {
        const { noteId } = req.params;
        const db = await getDb();
        const result = await db.run('DELETE FROM notes WHERE id = ?', [noteId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[noteController.deleteNote]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createNote, updateNote, deleteNote };
