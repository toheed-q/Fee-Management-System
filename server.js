const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logging
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('school_fee.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            userType TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Fee structure table
        db.run(`CREATE TABLE IF NOT EXISTS fee_structure (
            id TEXT PRIMARY KEY,
            feeType TEXT,
            amount REAL,
            dueDate TEXT,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Payments table
        db.run(`CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            userId TEXT,
            feeId TEXT,
            amount REAL,
            method TEXT,
            status TEXT,
            transactionReference TEXT,
            paymentDetails TEXT,
            paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (feeId) REFERENCES fee_structure(id)
        )`);
        
        // Parent fee assignments table
        db.run(`CREATE TABLE IF NOT EXISTS parent_fee_assignments (
            parentId TEXT,
            feeId TEXT,
            assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (parentId, feeId),
            FOREIGN KEY (parentId) REFERENCES users(id),
            FOREIGN KEY (feeId) REFERENCES fee_structure(id)
        )`);
        
        // Notifications table
        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            recipient_id TEXT,
            sender_id TEXT,
            subject TEXT,
            message TEXT,
            priority TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_status TEXT DEFAULT 'unread',
            FOREIGN KEY (recipient_id) REFERENCES users(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )`);
        
        // Add migration for paymentDetails column
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'", (err, result) => {
            if (err) {
                console.error('Error checking payments table schema:', err);
                return;
            }
            
            if (result && !result.sql.includes('paymentDetails')) {
                console.log('Migrating payments table: Adding paymentDetails column...');
                db.run("ALTER TABLE payments ADD COLUMN paymentDetails TEXT", (err) => {
                    if (err) {
                        console.error('Migration error:', err);
                    } else {
                        console.log('Successfully added paymentDetails column to payments table');
                    }
                });
            }
        });
    });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Import routes
const authRoutes = require('./routes/authRoutes');
const feeRoutes = require('./routes/feeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve index.html for all other routes (client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
}); 