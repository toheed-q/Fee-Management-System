const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.resolve(__dirname, 'school_fee.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database at', dbPath);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

module.exports = db; 