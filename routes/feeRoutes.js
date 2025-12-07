const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const db = require('../db/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Create new fee structure (Admin only)
router.post('/', authenticateToken, isAdmin, (req, res) => {
    const { feeType, amount, description, dueDate } = req.body;

    // Validate required fields
    if (!feeType || !amount || !dueDate) {
        return res.status(400).json({
            success: false,
            message: 'Please provide feeType, amount, and dueDate'
        });
    }

    // Validate fee type
    if (feeType !== 'monthly' && feeType !== 'term') {
        return res.status(400).json({
            success: false,
            message: 'Fee type must be either "monthly" or "term"'
        });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
        });
    }

    // Validate due date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
        return res.status(400).json({
            success: false,
            message: 'Due date must be in YYYY-MM-DD format'
        });
    }

    const feeId = uuidv4();

    db.run(
        'INSERT INTO fee_structure (id, feeType, amount, description, dueDate) VALUES (?, ?, ?, ?, ?)',
        [feeId, feeType, amount, description || null, dueDate],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error creating fee structure'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Fee structure created successfully',
                feeId: feeId
            });
        }
    );
});

// Get all fee structures (Admin only)
router.get('/all', authenticateToken, isAdmin, (req, res) => {
    db.all('SELECT * FROM fee_structure ORDER BY dueDate', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching fee structures'
            });
        }

        res.json({
            success: true,
            data: rows
        });
    });
});

// Get fee status for parent (filtered by parent ID)
router.get('/status', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Use a transaction for atomicity
    db.serialize(() => {
        db.all(
            `SELECT fs.*, 
                CASE 
                    WHEN p.id IS NOT NULL THEN 'paid'
                    WHEN fs.dueDate < date('now') THEN 'overdue'
                    ELSE 'pending'
                END as status
            FROM fee_structure fs
            LEFT JOIN payments p ON fs.id = p.feeId AND p.userId = ? AND p.status = 'completed'
            WHERE fs.id IN (
                -- General fees (not assigned to any specific parent)
                SELECT id FROM fee_structure 
                WHERE id NOT IN (SELECT feeId FROM parent_fee_assignments)
                
                UNION
                
                -- Fees specifically assigned to this parent
                SELECT feeId FROM parent_fee_assignments 
                WHERE parentId = ?
            )
            ORDER BY fs.dueDate`,
            [userId, userId],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error fetching fee status'
                    });
                }

                res.json({
                    success: true,
                    data: rows
                });
            }
        );
    });
});

// Get fee details by ID
router.get('/:id', authenticateToken, (req, res) => {
    const feeId = req.params.id;

    db.get('SELECT * FROM fee_structure WHERE id = ?', [feeId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching fee details'
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Fee not found'
            });
        }

        res.json({
            success: true,
            data: row
        });
    });
});

// Update fee structure (Admin only)
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
    const feeId = req.params.id;
    const { feeType, amount, description, dueDate } = req.body;

    // Validate required fields
    if (!feeType || !amount || !dueDate) {
        return res.status(400).json({
            success: false,
            message: 'Please provide feeType, amount, and dueDate'
        });
    }

    // Check if fee exists
    db.get('SELECT * FROM fee_structure WHERE id = ?', [feeId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error checking fee structure'
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Fee structure not found'
            });
        }

        // Update fee
        db.run(
            'UPDATE fee_structure SET feeType = ?, amount = ?, description = ?, dueDate = ? WHERE id = ?',
            [feeType, amount, description || null, dueDate, feeId],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error updating fee structure'
                    });
                }

                res.json({
                    success: true,
                    message: 'Fee structure updated successfully'
                });
            }
        );
    });
});

// Delete fee structure (Admin only)
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
    const feeId = req.params.id;

    // Check if fee is referenced in payments
    db.get('SELECT COUNT(*) as count FROM payments WHERE feeId = ?', [feeId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error checking fee references'
            });
        }

        if (result.count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete fee structure with associated payments'
            });
        }

        // Delete fee
        db.run('DELETE FROM fee_structure WHERE id = ?', [feeId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error deleting fee structure'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee structure not found'
                });
            }

            res.json({
                success: true,
                message: 'Fee structure deleted successfully'
            });
        });
    });
});

// Assign fee to specific parent (Admin only)
router.post('/assign-to-parent', authenticateToken, isAdmin, (req, res) => {
    const { parentId, feeType, amount, description, dueDate } = req.body;

    // Validate required fields
    if (!parentId || !feeType || !amount || !dueDate) {
        return res.status(400).json({
            success: false,
            message: 'Please provide parentId, feeType, amount, and dueDate'
        });
    }

    // Validate fee type
    if (feeType !== 'monthly' && feeType !== 'term') {
        return res.status(400).json({
            success: false,
            message: 'Fee type must be either "monthly" or "term"'
        });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
        });
    }

    // Validate due date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
        return res.status(400).json({
            success: false,
            message: 'Due date must be in YYYY-MM-DD format'
        });
    }

    // Use a transaction for atomicity
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if parent exists
        db.get('SELECT * FROM users WHERE id = ? AND userType = "parent"', [parentId], (err, parent) => {
            if (err) {
                db.run('ROLLBACK');
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error checking parent'
                });
            }

            if (!parent) {
                db.run('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Parent not found'
                });
            }

            // Create fee
            const feeId = uuidv4();

            db.run(
                'INSERT INTO fee_structure (id, feeType, amount, description, dueDate) VALUES (?, ?, ?, ?, ?)',
                [feeId, feeType, amount, description || null, dueDate],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('Database error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error creating fee structure'
                        });
                    }

                    // Record the parent-fee association (custom meta table)
                    db.run(
                        'INSERT INTO parent_fee_assignments (parentId, feeId, assignedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
                        [parentId, feeId],
                        function(err) {
                            if (err) {
                                // Check if the table exists, if not create it
                                if (err.message.includes('no such table')) {
                                    // Create the parent_fee_assignments table
                                    db.run(`CREATE TABLE parent_fee_assignments (
                                        parentId TEXT,
                                        feeId TEXT,
                                        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        PRIMARY KEY (parentId, feeId),
                                        FOREIGN KEY (parentId) REFERENCES users(id),
                                        FOREIGN KEY (feeId) REFERENCES fee_structure(id)
                                    )`, function(tableErr) {
                                        if (tableErr) {
                                            db.run('ROLLBACK');
                                            console.error('Database error:', tableErr);
                                            return res.status(500).json({
                                                success: false,
                                                message: 'Error creating assignment table'
                                            });
                                        }

                                        // Try the insert again
                                        db.run(
                                            'INSERT INTO parent_fee_assignments (parentId, feeId, assignedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
                                            [parentId, feeId],
                                            function(retryErr) {
                                                if (retryErr) {
                                                    db.run('ROLLBACK');
                                                    console.error('Database error:', retryErr);
                                                    return res.status(500).json({
                                                        success: false,
                                                        message: 'Error assigning fee to parent'
                                                    });
                                                }

                                                db.run('COMMIT');
                                                res.status(201).json({
                                                    success: true,
                                                    message: 'Fee assigned to parent successfully',
                                                    feeId: feeId
                                                });
                                            }
                                        );
                                    });
                                } else {
                                    db.run('ROLLBACK');
                                    console.error('Database error:', err);
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Error assigning fee to parent'
                                    });
                                }
                            } else {
                                db.run('COMMIT');
                                res.status(201).json({
                                    success: true,
                                    message: 'Fee assigned to parent successfully',
                                    feeId: feeId
                                });
                            }
                        }
                    );
                }
            );
        });
    });
});

module.exports = router; 