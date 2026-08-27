const { getDb } = require('../database');
const { generateId } = require('../utils/helpers');

function parseApi(a) {
    return {
        id: a.id,
        project_id: a.project_id,
        name: a.name,
        method: a.method,
        url: a.url,
        headers: a.headers,
        body: a.body,
        mockRows: a.mockRows,
        mockFields: JSON.parse(a.mockFields || '[]'),
    };
}

/**
 * POST /api/projects/:projectId/apis
 * Body: { name, method, url, headers?, body?, mockRows?, mockFields? }
 */
async function createApi(req, res) {
    try {
        const { projectId } = req.params;
        const { name, method = 'GET', url, headers = '', body = '', mockRows = 0, mockFields = [] } = req.body;
        if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

        const db = await getDb();
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const id = generateId();
        await db.run(
            'INSERT INTO apis (id, project_id, name, method, url, headers, body, mockRows, mockFields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, projectId, name, method, url, headers, body, mockRows, JSON.stringify(mockFields)]
        );

        res.status(201).json({ id, project_id: projectId, name, method, url, headers, body, mockRows, mockFields });
    } catch (err) {
        console.error('[apiController.createApi]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/projects/:projectId/apis/:apiId
 * Body: { name?, method?, url?, headers?, body?, mockRows?, mockFields? }
 */
async function updateApi(req, res) {
    try {
        const { apiId } = req.params;
        const db = await getDb();
        const existing = await db.get('SELECT * FROM apis WHERE id = ?', [apiId]);
        if (!existing) return res.status(404).json({ error: 'API not found' });

        const name       = req.body.name       ?? existing.name;
        const method     = req.body.method     ?? existing.method;
        const url        = req.body.url        ?? existing.url;
        const headers    = req.body.headers    ?? existing.headers;
        const body       = req.body.body       ?? existing.body;
        const mockRows   = req.body.mockRows   ?? existing.mockRows;
        const mockFields = req.body.mockFields ?? JSON.parse(existing.mockFields || '[]');

        await db.run(
            'UPDATE apis SET name = ?, method = ?, url = ?, headers = ?, body = ?, mockRows = ?, mockFields = ? WHERE id = ?',
            [name, method, url, headers, body, mockRows, JSON.stringify(mockFields), apiId]
        );

        res.json({ ...parseApi(existing), name, method, url, headers, body, mockRows, mockFields });
    } catch (err) {
        console.error('[apiController.updateApi]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * DELETE /api/projects/:projectId/apis/:apiId
 */
async function deleteApi(req, res) {
    try {
        const { apiId } = req.params;
        const db = await getDb();
        const result = await db.run('DELETE FROM apis WHERE id = ?', [apiId]);
        if (result.changes === 0) return res.status(404).json({ error: 'API not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[apiController.deleteApi]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createApi, updateApi, deleteApi };
