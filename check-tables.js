const db = require('./db/database');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Tables in database:');
        rows.forEach(row => {
            console.log(`- ${row.name}`);
        });
    }
    db.close();
}); 