const db = require('./db/database');
const { v4: uuidv4 } = require('uuid');

console.log('Starting test notification script');

// Test inserting a notification directly
const adminId = 'b99e86b5-d1e9-4b5b-84ba-855f8d65e8fc'; // From the test-db.js output
console.log('Using admin ID:', adminId);

db.all("SELECT id FROM users WHERE userType = 'parent' LIMIT 1", (err, parents) => {
    console.log('Querying for parent users');
    if (err) {
        console.error('Error getting parent:', err);
        db.close();
        return;
    }
    
    console.log('Query result:', parents);
    
    if (!parents || parents.length === 0) {
        console.log('No parent users found in database');
        db.close();
        return;
    }
    
    const parentId = parents[0].id;
    console.log(`Found parent with ID: ${parentId}`);
    
    const notificationId = uuidv4();
    console.log('Generated notification ID:', notificationId);
    
    // Insert a test notification
    const query = `INSERT INTO notifications (id, recipient_id, sender_id, subject, message, priority, created_at, read_status)
                   VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'unread')`;
    console.log('Query:', query);
    console.log('Parameters:', [notificationId, parentId, adminId, 'Test Subject', 'Test Message', 'normal']);
    
    db.run(
        query,
        [notificationId, parentId, adminId, 'Test Subject', 'Test Message', 'normal'],
        function(err) {
            if (err) {
                console.error('Error inserting notification:', err);
            } else {
                console.log('Successfully inserted test notification, changes:', this.changes);
            }
            
            // Check if it was inserted
            db.get('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1', (err, row) => {
                console.log('Checking for inserted notification');
                if (err) {
                    console.error('Error checking notification:', err);
                } else {
                    console.log('Latest notification:', row);
                }
                console.log('Closing database connection');
                db.close();
            });
        }
    );
}); 