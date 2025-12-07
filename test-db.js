const db = require('./db/database');

// Test query to check if the database is working
db.all('SELECT * FROM users LIMIT 5', (err, rows) => {
    if (err) {
        console.error('Database error:', err);
    } else {
        console.log('Successfully connected to database');
        console.log('Sample users:', rows);
    }
    
    // Check if notifications table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'", (err, row) => {
        if (err) {
            console.error('Error checking for notifications table:', err);
        } else {
            console.log('Notifications table exists:', !!row);
        }
        
        // Close connection when done
        db.close();
    });
}); 