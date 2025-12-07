// Database migration utility script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Starting database migration utility...');

// Connect to the database
const dbPath = path.resolve(__dirname, 'school_fee.db');
console.log(`Connecting to database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }

    console.log('Connected to database. Checking schema...');
    
    // Check if the payments table has the paymentDetails column
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'", (err, result) => {
        if (err) {
            console.error('Error checking table schema:', err);
            closeAndExit(1);
        }
        
        if (!result) {
            console.error('Payments table not found!');
            closeAndExit(1);
        }
        
        if (result.sql.includes('paymentDetails')) {
            console.log('The paymentDetails column already exists in the payments table.');
            closeAndExit(0);
        } else {
            console.log('Adding paymentDetails column to payments table...');
            
            db.run("ALTER TABLE payments ADD COLUMN paymentDetails TEXT", (err) => {
                if (err) {
                    console.error('Error adding paymentDetails column:', err);
                    closeAndExit(1);
                }
                
                console.log('Successfully added paymentDetails column to payments table!');
                console.log('Database migration completed successfully.');
                closeAndExit(0);
            });
        }
    });
});

function closeAndExit(code) {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        console.log('Database connection closed.');
        process.exit(code);
    });
} 