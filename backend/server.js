const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

// Routes
const projectRoutes = require('./routes/projectRoutes');
const linkRoutes    = require('./routes/linkRoutes');
const noteRoutes    = require('./routes/noteRoutes');
const graphRoutes   = require('./routes/graphRoutes');
const apiRoutes     = require('./routes/apiRoutes');
const settingRoutes = require('./routes/settingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',  // Vite dev server
        'http://localhost:3001',  // Self (if serving static)
        /^http:\/\/localhost:\d+$/, // Any localhost port in dev
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (graph node images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/projects',                          projectRoutes);
app.use('/api/projects/:projectId/links',         linkRoutes);
app.use('/api/projects/:projectId/notes',         noteRoutes);
app.use('/api/projects/:projectId/graphs',        graphRoutes);
app.use('/api/projects/:projectId/apis',          apiRoutes);
// ── Proxy Download (for Sharepoint/OneDrive links) ───────────────────────────
app.post('/api/proxy/download-excel', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });
    
    // Auto convert Sharepoint/OneDrive links to direct download
    if (url.includes('sharepoint.com') || url.includes('onedrive.live.com')) {
        url = url.split('?')[0] + '?download=1';
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('[Proxy Error]', err);
        res.status(500).json({ error: 'Failed to download file: ' + err.message });
    }
});

// ── Serve Frontend (Production Mode) ────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    // Fallback for SPA routing using regex instead of '*' string to avoid Express v5 path-to-regexp errors
    app.get(/^.*$/, (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Log Stream (SSE) ────────────────────────────────────────────────────────
app.get('/api/logs/stream', (req, res) => {
    const logPath = req.query.path;
    if (!logPath || !fs.existsSync(logPath)) {
        return res.status(404).json({ error: 'File not found or invalid path' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n'); // flush headers

    let currentSize = fs.statSync(logPath).size;
    
    // Read up to last 100KB initially to populate some context
    const CHUNK_SIZE = 100 * 1024;
    const startPos = Math.max(0, currentSize - CHUNK_SIZE);
    
    if (currentSize > 0) {
        const stream = fs.createReadStream(logPath, { start: startPos, end: currentSize - 1, encoding: 'utf8' });
        stream.on('data', chunk => {
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.trim()) res.write(`data: ${line}\n\n`);
            }
        });
    }

    const watcher = fs.watch(logPath, (eventType) => {
        if (eventType === 'change') {
            try {
                const stat = fs.statSync(logPath);
                if (stat.size > currentSize) {
                    const stream = fs.createReadStream(logPath, {
                        start: currentSize,
                        end: stat.size - 1,
                        encoding: 'utf8'
                    });
                    
                    stream.on('data', chunk => {
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.trim()) res.write(`data: ${line}\n\n`);
                        }
                    });
                    
                    currentSize = stat.size;
                } else if (stat.size < currentSize) {
                    currentSize = stat.size; // file truncated
                }
            } catch (err) {
                console.error('[SSE] File read error:', err);
            }
        }
    });

    req.on('close', () => {
        watcher.close();
    });
});

// ── 404 for unknown API routes ──────────────────────────────────────────────
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Boot ────────────────────────────────────────────────────────────────────
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[Server] Running at http://localhost:${PORT}`);
            console.log(`[Server] API base: http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('[Server] Failed to initialize database:', err);
        process.exit(1);
    });
