const db = require('./db/database');

// Log all tables in the database
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        db.close();
        return;
    }
    
    console.log('Tables in database:', tables.map(t => t.name));
    
    // For each table, get schema
    let completed = 0;
    
    tables.forEach(table => {
        const tableName = table.name;
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`Error getting schema for table ${tableName}:`, err);
            } else {
                console.log(`\nSchema for table "${tableName}":`);
                columns.forEach(col => {
                    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                });
            }
            
            completed++;
            if (completed === tables.length) {
                console.log('\nSchema check complete');
                db.close();
            }
        });
    });
}); 