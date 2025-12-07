const db = require('./db/database');

// Get detailed schema of notifications table
db.all(`PRAGMA table_info(notifications)`, (err, columns) => {
    if (err) {
        console.error('Error getting schema for notifications table:', err);
        db.close();
        return;
    }
    
    console.log('Schema for notifications table:');
    columns.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check parent_notifications table too
    db.all(`PRAGMA table_info(parent_notifications)`, (err, columns) => {
        if (err) {
            console.error('Error getting schema for parent_notifications table:', err);
        } else {
            console.log('\nSchema for parent_notifications table:');
            columns.forEach(col => {
                console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
            });
        }
        db.close();
    });
}); 