const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid token.' });
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.userType === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
};

// Middleware to check if user is parent
const isParent = (req, res, next) => {
    if (req.user && req.user.userType === 'parent') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. Parent privileges required.' });
    }
};

module.exports = {
    authenticateToken,
    isAdmin,
    isParent,
    JWT_SECRET
}; 