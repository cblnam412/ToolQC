const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const db = await open({
        filename: path.join(__dirname, 'data.db'),
        driver: sqlite3.Database
    });
    
    // Add collapsed column to projects if not exists
    try {
        await db.run('ALTER TABLE projects ADD COLUMN collapsed INTEGER DEFAULT 0');
        console.log('✅ Added "collapsed" column to projects');
    } catch (e) {
        if (e.message.includes('duplicate column')) {
            console.log('ℹ️  "collapsed" column already exists');
        } else {
            console.error('❌ Error:', e.message);
        }
    }
    
    await db.close();
    console.log('Migration complete.');
}

migrate().catch(console.error);
