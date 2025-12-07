const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Use the shared database connection
const db = require('../db/database');

// Middleware for admin access
const isAdmin = (req, res, next) => {
    console.log('User in isAdmin middleware:', req.user);
    if (!req.user) {
        console.log('req.user is undefined or null');
        return res.status(403).json({
            success: false,
            message: 'Admin access required - User not authenticated'
        });
    }
    
    if (req.user.userType !== 'admin') {
        console.log('User type is not admin:', req.user.userType);
        return res.status(403).json({
            success: false,
            message: 'Admin access required - Not an admin user'
        });
    }
    
    console.log('Admin access granted for user:', req.user.id);
    next();
};

// Send a notification - fixed to match actual database schema
router.post('/send', authenticateToken, isAdmin, (req, res) => {
    const { recipients, subject, message, priority } = req.body;
    
    console.log("Notification request received:", { 
        recipients: typeof recipients === 'string' ? recipients : 'array of ids', 
        subject, 
        message: message.substring(0, 20) + '...', 
        priority 
    });
    
    if (!recipients || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Recipients, subject, and message are required'
        });
    }

    try {
        // Create the notification in the main notifications table first
        const notificationId = uuidv4();
        
        // Insert into the notifications table with the correct schema
        db.run(
            `INSERT INTO notifications (id, adminId, subject, message, sentAt)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [notificationId, req.user.id, subject, message],
            function(err) {
                if (err) {
                    console.error('Error creating notification:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create notification'
                    });
                }
                
                console.log(`Created notification with ID: ${notificationId}`);
                
                // Function to assign notification to a parent
                const assignToParent = (parentId) => {
                    return new Promise((resolve, reject) => {
                        db.run(
                            `INSERT INTO parent_notifications (notificationId, parentId, isRead)
                             VALUES (?, ?, 0)`,
                            [notificationId, parentId],
                            function(err) {
                                if (err) {
                                    console.error(`Error assigning notification to parent ${parentId}:`, err);
                                    reject(err);
                                } else {
                                    console.log(`Notification assigned to parent ${parentId}`);
                                    resolve();
                                }
                            }
                        );
                    });
                };
                
                // Process recipients
                if (recipients === 'all') {
                    // Send to all parents
                    db.all(`SELECT id FROM users WHERE userType = 'parent'`, [], async (err, parents) => {
                        if (err) {
                            console.error('Error retrieving parents:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to retrieve parents'
                            });
                        }
                        
                        console.log(`Found ${parents.length} parents to assign notification to`);
                        
                        try {
                            // Process parents
                            for (const parent of parents) {
                                await assignToParent(parent.id);
                            }
                            
                            return res.json({
                                success: true,
                                message: `Notification sent to ${parents.length} parents`
                            });
                        } catch (error) {
                            console.error('Error assigning notification to parents:', error);
                            return res.status(500).json({
                                success: false,
                                message: 'Error processing notifications'
                            });
                        }
                    });
                } else if (Array.isArray(recipients)) {
                    // Send to selected parents
                    console.log(`Sending to ${recipients.length} selected parents`);
                    
                    const processRecipients = async () => {
                        try {
                            for (const parentId of recipients) {
                                await assignToParent(parentId);
                            }
                            return res.json({
                                success: true,
                                message: `Notification sent to ${recipients.length} parents`
                            });
                        } catch (error) {
                            console.error('Error sending to selected parents:', error);
                            return res.status(500).json({
                                success: false,
                                message: 'Error sending notifications'
                            });
                        }
                    };
                    
                    processRecipients();
                } else {
                    console.error('Invalid recipients format:', recipients);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid recipients format'
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error in notification route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications'
        });
    }
});

// Get notifications for a user
router.get('/user', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Join notifications with parent_notifications to get all notifications for this user
    db.all(`
        SELECT n.*, pn.isRead, pn.readAt, u.name as adminName 
        FROM notifications n
        JOIN parent_notifications pn ON n.id = pn.notificationId
        LEFT JOIN users u ON n.adminId = u.id
        WHERE pn.parentId = ?
        ORDER BY n.sentAt DESC
    `, [userId], (err, notifications) => {
        if (err) {
            console.error('Error retrieving notifications:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve notifications'
            });
        }
        
        res.json({
            success: true,
            data: notifications
        });
    });
});

// Mark notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    db.run(`
        UPDATE parent_notifications
        SET isRead = 1, readAt = CURRENT_TIMESTAMP
        WHERE notificationId = ? AND parentId = ?
    `, [notificationId, userId], function(err) {
        if (err) {
            console.error('Error marking notification as read:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update notification'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or not authorized'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    });
});

// Delete a notification
router.delete('/:id', authenticateToken, (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // Since we have a parent_notifications junction table, we only remove the entry for this user
    db.run(`
        DELETE FROM parent_notifications
        WHERE notificationId = ? AND parentId = ?
    `, [notificationId, userId], function(err) {
        if (err) {
            console.error('Error deleting notification:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notification'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or not authorized'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification deleted'
        });
    });
});

module.exports = router; 