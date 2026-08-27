const { getDb } = require('../database');
const { generateId } = require('../utils/helpers');

/**
 * GET /api/projects
 * Returns all projects with their nested links, notes, graphs, apis.
 */
async function getProjects(req, res) {
    try {
        const db = await getDb();
        const [projects, links, notes, graphs, apis] = await Promise.all([
            db.all('SELECT * FROM projects ORDER BY rowid ASC'),
            db.all('SELECT * FROM links'),
            db.all('SELECT * FROM notes'),
            db.all('SELECT * FROM graphs'),
            db.all('SELECT * FROM apis'),
        ]);

        const result = projects.map(p => ({
            ...p,
            collapsed: Boolean(p.collapsed),
            links: links.filter(l => l.project_id === p.id),
            notes: notes.filter(n => n.project_id === p.id),
            graphs: graphs
                .filter(g => g.project_id === p.id)
                .map(g => ({
                    id: g.id,
                    name: g.name,
                    ...JSON.parse(g.data_json || '{}'),
                })),
            apis: apis
                .filter(a => a.project_id === p.id)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    method: a.method,
                    url: a.url,
                    headers: a.headers,
                    body: a.body,
                    mockRows: a.mockRows,
                    mockFields: JSON.parse(a.mockFields || '[]'),
                })),
        }));

        res.json(result);
    } catch (err) {
        console.error('[projectController.getProjects]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/projects/:id
 */
async function getProjectById(req, res) {
    try {
        const db = await getDb();
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const [links, notes, graphs, apis] = await Promise.all([
            db.all('SELECT * FROM links WHERE project_id = ?', [project.id]),
            db.all('SELECT * FROM notes WHERE project_id = ?', [project.id]),
            db.all('SELECT * FROM graphs WHERE project_id = ?', [project.id]),
            db.all('SELECT * FROM apis WHERE project_id = ?', [project.id]),
        ]);

        res.json({
            ...project,
            collapsed: Boolean(project.collapsed),
            links,
            notes,
            graphs: graphs.map(g => ({ id: g.id, name: g.name, ...JSON.parse(g.data_json || '{}') })),
            apis: apis.map(a => ({ ...a, mockFields: JSON.parse(a.mockFields || '[]') })),
        });
    } catch (err) {
        console.error('[projectController.getProjectById]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * POST /api/projects
 * Body: { name, folder? }
 */
async function createProject(req, res) {
    try {
        const { name, folder = '' } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const db = await getDb();
        const id = generateId();
        await db.run(
            'INSERT INTO projects (id, name, folder, collapsed) VALUES (?, ?, ?, 0)',
            [id, name, folder]
        );

        res.status(201).json({ id, name, folder, collapsed: false, links: [], notes: [], graphs: [], apis: [] });
    } catch (err) {
        console.error('[projectController.createProject]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/projects/:id
 * Body: { name?, folder?, collapsed? }
 */
async function updateProject(req, res) {
    try {
        const db = await getDb();
        const existing = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Project not found' });

        const name = req.body.name ?? existing.name;
        const folder = req.body.folder ?? existing.folder;
        const collapsed = req.body.collapsed !== undefined ? (req.body.collapsed ? 1 : 0) : existing.collapsed;

        await db.run(
            'UPDATE projects SET name = ?, folder = ?, collapsed = ? WHERE id = ?',
            [name, folder, collapsed, req.params.id]
        );

        res.json({ ...existing, name, folder, collapsed: Boolean(collapsed) });
    } catch (err) {
        console.error('[projectController.updateProject]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * DELETE /api/projects/:id
 */
async function deleteProject(req, res) {
    try {
        const db = await getDb();
        const result = await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[projectController.deleteProject]', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
