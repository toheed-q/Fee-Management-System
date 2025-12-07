const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../db/database');
const { JWT_SECRET, authenticateToken, isAdmin } = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, userType } = req.body;

    // Validate required fields
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide all required fields: name, email, password, userType' 
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide a valid email address' 
        });
    }

    // Validate password length
    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 6 characters long' 
        });
    }

    // Validate user type
    if (userType !== 'admin' && userType !== 'parent') {
        return res.status(400).json({ 
            success: false, 
            message: 'User type must be either "admin" or "parent"' 
        });
    }

    try {
        // Check if email already exists
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error' 
                });
            }

            if (user) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use' 
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const userId = uuidv4();

            // Insert new user
            db.run(
                'INSERT INTO users (id, name, email, password, userType) VALUES (?, ?, ?, ?, ?)',
                [userId, name, email, hashedPassword, userType],
                (err) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating user' 
                        });
                    }

                    res.status(201).json({ 
                        success: true, 
                        message: 'Registration successful! Please log in.' 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// User login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide email and password' 
        });
    }

    try {
        // Find user by email
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error' 
                });
            }

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            // Validate password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            // Create JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    name: user.name,
                    email: user.email, 
                    userType: user.userType 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Return success with token and user data
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.userType
                }
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Get all parents (Admin only)
router.get('/parents', authenticateToken, isAdmin, (req, res) => {
    // Get all parent users
    db.all(
        'SELECT id, name, email, createdAt FROM users WHERE userType = "parent" ORDER BY createdAt DESC',
        (err, users) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching parent users'
                });
            }

            res.json({
                success: true,
                data: users
            });
        }
    );
});

module.exports = router; 