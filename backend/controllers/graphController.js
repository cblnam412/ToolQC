const { getDb } = require('../database');
const { generateId } = require('../utils/helpers');

// Fields stored inside data_json
const GRAPH_JSON_FIELDS = [
    'text', 'layout', 'startNodes', 'endNodes',
    'images', 'childCounts', 'edgeNames', 'subNodeNames',
    'positions', 'fixed'
];

function buildDataJson(body) {
    const data = {};
    GRAPH_JSON_FIELDS.forEach(f => {
        if (body[f] !== undefined) data[f] = body[f];
    });
    return JSON.stringify(data);
}

function parseGraph(g) {
    return {
        id: g.id,
        project_id: g.project_id,
        name: g.name,
        ...JSON.parse(g.data_json || '{}'),
    };
}

/**
 * POST /api/projects/:projectId/graphs
 * Body: { name, text?, layout?, startNodes?, endNodes?, images?, ... }
 */
async function createGraph(req, res) {
    try {
        const { projectId } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const db = await getDb();
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const id = generateId();
        const dataJson = buildDataJson(req.body);
        await db.run(
            'INSERT INTO graphs (id, project_id, name, data_json) VALUES (?, ?, ?, ?)',
            [id, projectId, name, dataJson]
        );

        const row = await db.get('SELECT * FROM graphs WHERE id = ?', [id]);
        res.status(201).json(parseGraph(row));
    } catch (err) {
        console.error('[graphController.createGraph]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/projects/:projectId/graphs/:graphId
 * Body: { name?, text?, layout?, ... }
 */
async function updateGraph(req, res) {
    try {
        const { graphId } = req.params;
        const db = await getDb();
        const existing = await db.get('SELECT * FROM graphs WHERE id = ?', [graphId]);
        if (!existing) return res.status(404).json({ error: 'Graph not found' });

        const name = req.body.name ?? existing.name;

        // Merge existing data_json with new fields
        const existingData = JSON.parse(existing.data_json || '{}');
        GRAPH_JSON_FIELDS.forEach(f => {
            if (req.body[f] !== undefined) existingData[f] = req.body[f];
        });

        await db.run(
            'UPDATE graphs SET name = ?, data_json = ? WHERE id = ?',
            [name, JSON.stringify(existingData), graphId]
        );

        const updated = await db.get('SELECT * FROM graphs WHERE id = ?', [graphId]);
        res.json(parseGraph(updated));
    } catch (err) {
        console.error('[graphController.updateGraph]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * DELETE /api/projects/:projectId/graphs/:graphId
 */
async function deleteGraph(req, res) {
    try {
        const { graphId } = req.params;
        const db = await getDb();
        const result = await db.run('DELETE FROM graphs WHERE id = ?', [graphId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Graph not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[graphController.deleteGraph]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createGraph, updateGraph, deleteGraph };
