const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const db = require('../db/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Process payment
router.post('/process', authenticateToken, (req, res) => {
    const { feeId, amount, method, cardDetails, bankDetails } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!feeId || !amount || !method) {
        return res.status(400).json({
            success: false,
            message: 'Please provide feeId, amount, and method'
        });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
        });
    }

    // Validate payment method and additional details
    if (method === 'credit_card') {
        if (!cardDetails || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
            return res.status(400).json({
                success: false,
                message: 'Credit card details are incomplete'
            });
        }

        // Additional card validation could go here
        const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
        if (cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid card number'
            });
        }
    } else if (method === 'bank_transfer') {
        if (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountTitle) {
            return res.status(400).json({
                success: false,
                message: 'Bank transfer details are incomplete'
            });
        }

        // Additional bank account validation could go here
        if (bankDetails.accountNumber.length < 10 || !/^\d+$/.test(bankDetails.accountNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid account number'
            });
        }
    } else {
        return res.status(400).json({
            success: false,
            message: 'Payment method must be either "credit_card" or "bank_transfer"'
        });
    }

    // Use a transaction for atomicity and concurrent safety
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Check if fee exists
        db.get('SELECT * FROM fee_structure WHERE id = ?', [feeId], (err, fee) => {
            if (err) {
                db.run('ROLLBACK');
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error checking fee'
                });
            }

            if (!fee) {
                db.run('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Fee not found'
                });
            }

            // Check if payment already exists
            db.get(
                'SELECT * FROM payments WHERE userId = ? AND feeId = ? AND status = "completed"',
                [userId, feeId],
                (err, existingPayment) => {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('Database error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error checking existing payment'
                        });
                    }

                    if (existingPayment) {
                        db.run('ROLLBACK');
                        return res.status(400).json({
                            success: false,
                            message: 'Payment already made for this fee'
                        });
                    }

                    // Create payment record
                    const paymentId = uuidv4();
                    const transactionReference = `TXN-${Math.floor(Math.random() * 1000000)}`;

                    // Add additional payment details based on method
                    let paymentDetails = null;
                    if (method === 'credit_card') {
                        paymentDetails = JSON.stringify({
                            lastFour: cardDetails.cardNumber.slice(-4),
                            expiryDate: cardDetails.expiryDate
                        });
                    } else if (method === 'bank_transfer') {
                        paymentDetails = JSON.stringify({
                            bankName: bankDetails.bankName,
                            accountTitle: bankDetails.accountTitle,
                            accountNumberLastFour: bankDetails.accountNumber.slice(-4)
                        });
                    }

                    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'", (err, result) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('Database error:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Error checking database schema'
                            });
                        }
                        
                        // Check if paymentDetails column exists
                        const hasPaymentDetails = result && result.sql.includes('paymentDetails');
                        
                        // Prepare insert statement based on schema
                        let insertSQL, insertParams;
                        
                        if (hasPaymentDetails) {
                            insertSQL = 'INSERT INTO payments (id, userId, feeId, amount, method, status, transactionReference, paymentDetails) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                            insertParams = [paymentId, userId, feeId, amount, method, 'completed', transactionReference, paymentDetails];
                        } else {
                            // Fallback to old schema without paymentDetails
                            insertSQL = 'INSERT INTO payments (id, userId, feeId, amount, method, status, transactionReference) VALUES (?, ?, ?, ?, ?, ?, ?)';
                            insertParams = [paymentId, userId, feeId, amount, method, 'completed', transactionReference];
                        }
                        
                        db.run(insertSQL, insertParams, function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                console.error('Database error:', err);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Error processing payment'
                                });
                            }

                            db.run('COMMIT');
                            res.status(201).json({
                                success: true,
                                message: 'Payment processed successfully',
                                paymentId,
                                transactionReference
                            });
                        });
                    });
                }
            );
        });
    });
});

// Get payment history for current user
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
        `SELECT p.*, fs.feeType, fs.dueDate 
         FROM payments p
         JOIN fee_structure fs ON p.feeId = fs.id
         WHERE p.userId = ?
         ORDER BY p.paymentDate DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching payment history'
                });
            }

            res.json({
                success: true,
                data: rows
            });
        }
    );
});

// Get all payments (Admin only)
router.get('/all', authenticateToken, isAdmin, (req, res) => {
    db.all(
        `SELECT p.*, u.name as userName, u.email as userEmail, fs.feeType, fs.dueDate
         FROM payments p
         JOIN users u ON p.userId = u.id
         JOIN fee_structure fs ON p.feeId = fs.id
         ORDER BY p.paymentDate DESC`,
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching payments'
                });
            }

            res.json({
                success: true,
                data: rows
            });
        }
    );
});

// Get all payments with pagination and filtering (Admin only)
router.get('/all-paginated', authenticateToken, isAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const dateFilter = parseInt(req.query.dateFilter) || 0;
    
    // Build query with filters
    let query = `
        SELECT p.*, u.name as userName, u.email as userEmail, fs.feeType, fs.dueDate
        FROM payments p
        JOIN users u ON p.userId = u.id
        JOIN fee_structure fs ON p.feeId = fs.id
        WHERE 1=1
    `;
    
    let countQuery = `
        SELECT COUNT(*) AS total
        FROM payments p
        JOIN users u ON p.userId = u.id
        JOIN fee_structure fs ON p.feeId = fs.id
        WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search filter if provided
    if (search) {
        const searchFilter = ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        query += searchFilter;
        countQuery += searchFilter;
        queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    // Add status filter if provided
    if (status) {
        const statusFilter = ` AND p.status = ?`;
        query += statusFilter;
        countQuery += statusFilter;
        queryParams.push(status);
    }
    
    // Add date filter if provided
    if (dateFilter > 0) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - dateFilter);
        const dateString = dateLimit.toISOString();
        
        const dateFilter = ` AND p.paymentDate >= ?`;
        query += dateFilter;
        countQuery += dateFilter;
        queryParams.push(dateString);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY p.paymentDate DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    // Get total count first
    db.get(countQuery, queryParams.slice(0, queryParams.length - 2), (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error counting total payments'
            });
        }
        
        const total = countResult.total;
        
        // Now get the paginated data
        db.all(query, queryParams, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching payments'
                });
            }
            
            res.json({
                success: true,
                data: {
                    transactions: rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        });
    });
});

// Get payment details by ID
router.get('/:id', authenticateToken, (req, res) => {
    const paymentId = req.params.id;
    const userId = req.user.id;
    const isAdminUser = req.user.userType === 'admin';

    // Build query based on user type
    let query = `
        SELECT p.*, u.name as userName, u.email as userEmail, fs.feeType, fs.dueDate
        FROM payments p
        JOIN users u ON p.userId = u.id
        JOIN fee_structure fs ON p.feeId = fs.id
        WHERE p.id = ?
    `;
    
    // For parents, restrict to their own payments
    if (!isAdminUser) {
        query += ' AND p.userId = ?';
    }

    // Execute query with appropriate parameters
    const params = isAdminUser ? [paymentId] : [paymentId, userId];
    
    db.get(query, params, (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching payment details'
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: row
        });
    });
});

// Get dashboard summary for admin
router.get('/dashboard/summary', authenticateToken, isAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    db.get(
        `SELECT 
            SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as totalCollected,
            COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completedPayments,
            (SELECT COUNT(*) FROM fee_structure fs 
             LEFT JOIN payments p ON fs.id = p.feeId 
             WHERE p.id IS NULL OR p.status != 'completed') as pendingPayments,
            (SELECT COUNT(*) FROM fee_structure fs 
             LEFT JOIN payments p ON fs.id = p.feeId AND p.status = 'completed'
             WHERE (p.id IS NULL OR p.status != 'completed') AND fs.dueDate < ?) as overduePayments
        FROM payments p`,
        [today],
        (err, summary) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching dashboard summary'
                });
            }

            // Get recent payments
            db.all(
                `SELECT p.*, u.name as userName, u.email as userEmail, fs.feeType
                 FROM payments p
                 JOIN users u ON p.userId = u.id
                 JOIN fee_structure fs ON p.feeId = fs.id
                 ORDER BY p.paymentDate DESC
                 LIMIT 5`,
                (err, recentPayments) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error fetching recent payments'
                        });
                    }

                    res.json({
                        success: true,
                        data: {
                            summary: summary || { totalCollected: 0, completedPayments: 0, pendingPayments: 0, overduePayments: 0 },
                            recentPayments: recentPayments || []
                        }
                    });
                }
            );
        }
    );
});

// Generate complete payment report for admin
router.get('/report', authenticateToken, isAdmin, (req, res) => {
    db.all(
        `SELECT 
            u.id as userId, 
            u.name as userName, 
            u.email as userEmail,
            COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as totalPaymentsMade,
            SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as totalAmountPaid,
            (
                SELECT COUNT(*) 
                FROM parent_fee_assignments pfa
                JOIN fee_structure fs ON pfa.feeId = fs.id
                LEFT JOIN payments p2 ON p2.feeId = fs.id AND p2.userId = u.id AND p2.status = 'completed'
                WHERE pfa.parentId = u.id AND (p2.id IS NULL OR p2.status != 'completed')
            ) as pendingPaymentsCount
        FROM users u
        LEFT JOIN payments p ON u.id = p.userId
        WHERE u.userType = 'parent'
        GROUP BY u.id
        ORDER BY u.name`,
        (err, userSummary) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error generating payment report'
                });
            }

            // Get detailed payment information
            db.all(
                `SELECT 
                    p.id as paymentId,
                    u.id as userId,
                    u.name as userName,
                    u.email as userEmail,
                    fs.id as feeId,
                    fs.feeType,
                    fs.description as feeDescription,
                    fs.dueDate,
                    p.amount,
                    p.status,
                    p.method,
                    p.transactionReference,
                    p.paymentDate
                FROM payments p
                JOIN users u ON p.userId = u.id
                JOIN fee_structure fs ON p.feeId = fs.id
                ORDER BY u.name, p.paymentDate DESC`,
                (err, paymentDetails) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error generating payment report'
                        });
                    }

                    // Get unpaid fees information
                    db.all(
                        `SELECT 
                            u.id as userId,
                            u.name as userName,
                            fs.id as feeId,
                            fs.feeType,
                            fs.amount,
                            fs.description,
                            fs.dueDate
                        FROM parent_fee_assignments pfa
                        JOIN users u ON pfa.parentId = u.id
                        JOIN fee_structure fs ON pfa.feeId = fs.id
                        LEFT JOIN payments p ON p.feeId = fs.id AND p.userId = u.id AND p.status = 'completed'
                        WHERE p.id IS NULL OR p.status != 'completed'
                        ORDER BY u.name, fs.dueDate`,
                        (err, unpaidFees) => {
                            if (err) {
                                console.error('Database error:', err);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Error generating payment report'
                                });
                            }

                            res.json({
                                success: true,
                                data: {
                                    userSummary: userSummary || [],
                                    paymentDetails: paymentDetails || [],
                                    unpaidFees: unpaidFees || []
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});

// Get a summary of dashboard data for admin
router.get("/dashboard/summary", authenticateToken, isAdmin, async (req, res) => {
    // ... existing code ...
});

// Get parents with unpaid fees
router.get("/unpaid-parents", authenticateToken, isAdmin, (req, res) => {
    db.all(`
        SELECT DISTINCT 
            u.id, 
            u.name, 
            u.email, 
            COUNT(fs.id) AS pendingFees,
            SUM(fs.amount) AS pendingAmount
        FROM 
            users u
        JOIN 
            parent_fee_assignments pfa ON u.id = pfa.parentId
        JOIN 
            fee_structure fs ON pfa.feeId = fs.id
        LEFT JOIN 
            payments p ON p.feeId = fs.id AND p.userId = u.id AND p.status = 'completed'
        WHERE 
            u.userType = 'parent' AND (p.id IS NULL OR p.status != 'completed')
        GROUP BY 
            u.id
        ORDER BY 
            pendingAmount DESC
    `, (err, parents) => {
        if (err) {
            console.error("Error fetching unpaid parents:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch parents with unpaid fees"
            });
        }

        return res.json({
            success: true,
            data: parents
        });
    });
});

// Get parents with overdue fees
router.get("/overdue-parents", authenticateToken, isAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.all(`
        SELECT DISTINCT 
            u.id, 
            u.name, 
            u.email, 
            COUNT(fs.id) AS overdueFees,
            SUM(fs.amount) AS overdueAmount,
            JULIANDAY(?) - JULIANDAY(MIN(fs.dueDate)) AS daysOverdue
        FROM 
            users u
        JOIN 
            parent_fee_assignments pfa ON u.id = pfa.parentId
        JOIN 
            fee_structure fs ON pfa.feeId = fs.id
        LEFT JOIN 
            payments p ON p.feeId = fs.id AND p.userId = u.id AND p.status = 'completed'
        WHERE 
            u.userType = 'parent' AND (p.id IS NULL OR p.status != 'completed') AND fs.dueDate < ?
        GROUP BY 
            u.id
        ORDER BY 
            daysOverdue DESC
    `, [today, today], (err, parents) => {
        if (err) {
            console.error("Error fetching overdue parents:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch parents with overdue fees"
            });
        }

        return res.json({
            success: true,
            data: parents
        });
    });
});

module.exports = router; 