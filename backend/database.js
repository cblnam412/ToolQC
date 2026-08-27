const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.db');

// Singleton connection
let _db = null;

/**
 * Returns a singleton SQLite connection.
 * Opens and initializes the DB on first call.
 */
async function getDb() {
    if (_db) return _db;
    _db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Performance pragmas
    await _db.exec('PRAGMA journal_mode = WAL;');
    await _db.exec('PRAGMA synchronous = NORMAL;');
    await _db.exec('PRAGMA cache_size = -8000;'); // 8MB cache
    await _db.exec('PRAGMA foreign_keys = ON;');

    return _db;
}

/**
 * Creates all tables if not exist and sets up uploads dir.
 */
async function initDatabase() {
    const db = await getDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id      TEXT PRIMARY KEY,
            name    TEXT NOT NULL,
            folder  TEXT,
            collapsed INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS links (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL,
            name        TEXT NOT NULL,
            url         TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notes (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL,
            title       TEXT,
            content     TEXT,
            color       TEXT DEFAULT 'yellow',
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS graphs (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL,
            name        TEXT,
            data_json   TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS apis (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL,
            name        TEXT,
            method      TEXT,
            url         TEXT,
            headers     TEXT,
            body        TEXT,
            mockRows    INTEGER,
            mockFields  TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key     TEXT PRIMARY KEY,
            value   TEXT
        );
    `);

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log('[DB] Database initialized successfully.');
    return db;
}

module.exports = { getDb, initDatabase };
