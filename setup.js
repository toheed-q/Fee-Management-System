const db = require('./db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Setup database tables
async function setupDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Drop existing tables if they exist
            db.run(`DROP TABLE IF EXISTS payments`);
            db.run(`DROP TABLE IF EXISTS fee_structure`);
            db.run(`DROP TABLE IF EXISTS users`);

            // Create tables
            db.run(`CREATE TABLE users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                userType TEXT NOT NULL CHECK (userType IN ('admin', 'parent')),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    reject(err);
                } else {
                    console.log('Users table created successfully');
                }
            });

            db.run(`CREATE TABLE fee_structure (
                id TEXT PRIMARY KEY,
                feeType TEXT NOT NULL CHECK (feeType IN ('monthly', 'term')),
                amount REAL NOT NULL,
                description TEXT,
                dueDate TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating fee_structure table:', err.message);
                    reject(err);
                } else {
                    console.log('Fee structure table created successfully');
                }
            });

            db.run(`CREATE TABLE payments (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                feeId TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT NOT NULL CHECK (method IN ('credit_card', 'bank_transfer')),
                status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
                transactionReference TEXT,
                paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (feeId) REFERENCES fee_structure(id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating payments table:', err.message);
                    reject(err);
                } else {
                    console.log('Payments table created successfully');
                }
            });

            // Create default admin user
            createDefaultAdmin().then(() => {
                console.log('Database setup complete');
                resolve();
            }).catch(err => {
                console.error('Error creating default admin:', err.message);
                reject(err);
            });
        });
    });
}

// Create default admin user
async function createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();

    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO users (id, name, email, password, userType) VALUES (?, ?, ?, ?, ?)',
            [adminId, 'System Admin', 'admin@school.com', hashedPassword, 'admin'],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Default admin user created: admin@school.com / admin123');
                    resolve();
                }
            }
        );
    });
}

// Run setup
setupDatabase()
    .then(() => {
        console.log('Database initialized successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }); 