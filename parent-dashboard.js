// Global variables
const API_BASE_URL = 'http://localhost:3000/api';
let paymentModal;
let allPaymentsModal;
let allNotificationsModal;
let currentUser = JSON.parse(localStorage.getItem('user'));
let currentPayment = null;
const token = localStorage.getItem('token');
let allPayments = []; // Store all payments
let allNotifications = []; // Store all notifications
const ITEMS_TO_SHOW = 4; // Number of items to show in dashboard sections
let darkMode = localStorage.getItem('darkMode') === 'enabled'; // Dark mode state

// Check if user is logged in and is parent
if (!currentUser || !token || currentUser.userType !== 'parent') {
    window.location.href = 'index.html';
}

// Add token to all fetch requests
const fetchWithAuth = async (url, options = {}) => {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    return fetch(url, { ...options, headers });
};

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const feeStatusTable = document.getElementById('feeStatusTable');
const paymentHistory = document.getElementById('paymentHistory');
const paymentMethod = document.getElementById('paymentMethod');
const creditCardFields = document.getElementById('creditCardFields');
const bankTransferFields = document.getElementById('bankTransferFields');
const processPaymentBtn = document.getElementById('processPayment');
const parentNameDisplay = document.getElementById('parentNameDisplay');
const parentName = document.getElementById('parentName');
const pageLoader = document.getElementById('pageLoader');
const notificationsContainer = document.getElementById('notificationsContainer');
const viewAllPaymentsBtn = document.getElementById('viewAllPaymentsBtn');
const viewAllNotificationsBtn = document.getElementById('viewAllNotificationsBtn');
const allPaymentHistory = document.getElementById('allPaymentHistory');
const allNotificationsContainer = document.getElementById('allNotificationsContainer');
const darkModeToggle = document.getElementById('darkModeToggle');

// Display parent name
if (currentUser && currentUser.name) {
    parentNameDisplay.textContent = `Welcome, ${currentUser.name}`;
    parentName.textContent = currentUser.name;
}

// Apply dark mode from saved preference
if (darkMode) {
    document.body.classList.add('dark-mode');
}

// Initialize page and components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modals
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    allPaymentsModal = new bootstrap.Modal(document.getElementById('allPaymentsModal'));
    allNotificationsModal = new bootstrap.Modal(document.getElementById('allNotificationsModal'));
    
    // Load dashboard data
    loadDashboardData().then(() => {
        // Hide loader after data is loaded
        setTimeout(() => {
            pageLoader.classList.add('fade-out');
            setTimeout(() => {
                pageLoader.style.display = 'none';
            }, 500);
        }, 500);
    }).catch(() => {
        // Hide loader even if there's an error
        pageLoader.classList.add('fade-out');
        setTimeout(() => {
            pageLoader.style.display = 'none';
        }, 500);
    });
});

// Event Listeners
logoutBtn.addEventListener('click', handleLogout);
paymentMethod.addEventListener('change', togglePaymentFields);
processPaymentBtn.addEventListener('click', processPayment);
viewAllPaymentsBtn.addEventListener('click', () => allPaymentsModal.show());
viewAllNotificationsBtn.addEventListener('click', () => allNotificationsModal.show());
darkModeToggle.addEventListener('click', toggleDarkMode);

// Functions
async function loadDashboardData() {
    try {
        const [feeStatus, history, notifications] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/fees/status`),
            fetchWithAuth(`${API_BASE_URL}/payments/history`),
            fetchWithAuth(`${API_BASE_URL}/notifications/user`)
        ]);

        if (!feeStatus.ok || !history.ok || !notifications.ok) {
            if (feeStatus.status === 401 || history.status === 401 || notifications.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Failed to load dashboard data');
        }

        const feeStatusData = await feeStatus.json();
        const historyData = await history.json();
        const notificationsData = await notifications.json();

        if (!feeStatusData.success || !historyData.success || !notificationsData.success) {
            throw new Error('Error loading data from server');
        }

        // Store all data
        allPayments = historyData.data || [];
        allNotifications = notificationsData.data || [];

        // Update fee status table
        updateFeeStatusTable(feeStatusData.data || []);
        
        // Update payment history (limited)
        updatePaymentHistory(allPayments.slice(0, ITEMS_TO_SHOW));
        
        // Update all payment history (modal)
        updateAllPaymentHistory(allPayments);

        // Update summary
        updateSummary(feeStatusData.data || []);
        
        // Update notifications (limited)
        updateNotifications(allNotifications.slice(0, ITEMS_TO_SHOW));
        
        // Update all notifications (modal)
        updateAllNotifications(allNotifications);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

function updateFeeStatusTable(fees) {
    if (fees.length === 0) {
        feeStatusTable.innerHTML = '<tr><td colspan="5" class="text-center">No fee records found</td></tr>';
        return;
    }

    feeStatusTable.innerHTML = fees.map((fee, index) => `
        <tr style="animation-delay: ${index * 0.05}s">
            <td>${fee.feeType || 'Unknown'}</td>
            <td>$${fee.amount}</td>
            <td>${new Date(fee.dueDate).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${getStatusBadgeClass(fee.status)}">
                    ${fee.status}
                </span>
            </td>
            <td>
                ${fee.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary payment-btn" onclick="initiatePayment('${fee.id}', ${fee.amount})">
                        Pay Now
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function updatePaymentHistory(history) {
    if (history.length === 0) {
        paymentHistory.innerHTML = '<div class="text-center py-3">No payment history available</div>';
        return;
    }

    paymentHistory.innerHTML = history.map((payment, index) => {
        let paymentDetails = '';
        try {
            // Only try to parse paymentDetails if it exists
            if (payment.paymentDetails) {
                const details = JSON.parse(payment.paymentDetails);
                if (payment.method === 'credit_card') {
                    paymentDetails = `Card ending in ${details.lastFour || '****'}`;
                } else if (payment.method === 'bank_transfer') {
                    paymentDetails = `${details.bankName || 'Bank'} - Account ending in ${details.accountNumberLastFour || '****'}`;
                }
            } else {
                // Handle cases where paymentDetails doesn't exist in older records
                paymentDetails = payment.method;
            }
        } catch (e) {
            console.error('Error parsing payment details:', e);
            // Fallback to just showing the method if parsing fails
            paymentDetails = payment.method;
        }

        return `
        <div class="payment-history-item mb-2" style="animation-delay: ${index * 0.05}s">
            <div class="d-flex justify-content-between">
                <span>${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</span>
                <span>$${payment.amount}</span>
            </div>
            <div class="text-muted small">${payment.method} ${paymentDetails !== payment.method ? '- ' + paymentDetails : ''}</div>
            <div class="text-muted small">Status: ${payment.status}</div>
        </div>
    `}).join('');
}

function updateAllPaymentHistory(history) {
    if (history.length === 0) {
        allPaymentHistory.innerHTML = '<div class="text-center py-3">No payment history available</div>';
        return;
    }

    allPaymentHistory.innerHTML = history.map((payment, index) => {
        let paymentDetails = '';
        try {
            // Only try to parse paymentDetails if it exists
            if (payment.paymentDetails) {
                const details = JSON.parse(payment.paymentDetails);
                if (payment.method === 'credit_card') {
                    paymentDetails = `Card ending in ${details.lastFour || '****'}`;
                } else if (payment.method === 'bank_transfer') {
                    paymentDetails = `${details.bankName || 'Bank'} - Account ending in ${details.accountNumberLastFour || '****'}`;
                }
            } else {
                // Handle cases where paymentDetails doesn't exist in older records
                paymentDetails = payment.method;
            }
        } catch (e) {
            console.error('Error parsing payment details:', e);
            // Fallback to just showing the method if parsing fails
            paymentDetails = payment.method;
        }

        return `
        <div class="payment-history-item mb-3 p-3 border-bottom" style="animation-delay: ${index * 0.03}s">
            <div class="d-flex justify-content-between">
                <span class="fw-bold">${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</span>
                <span class="fw-bold text-primary">$${payment.amount}</span>
            </div>
            <div>Fee Type: ${payment.feeType || 'Unknown'}</div>
            <div class="text-muted small">
                Payment Method: ${payment.method} ${paymentDetails !== payment.method ? '- ' + paymentDetails : ''}
            </div>
            <div class="text-muted small">
                Status: <span class="badge bg-${getStatusBadgeClass(payment.status)}">${payment.status}</span>
            </div>
            <div class="text-muted small">
                Transaction Reference: ${payment.transactionReference || 'N/A'}
            </div>
        </div>
    `}).join('');
}

function updateSummary(fees) {
    const totalDue = fees
        .filter(fee => fee.status === 'pending' || fee.status === 'overdue')
        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
    
    const nextDue = fees
        .filter(fee => fee.status === 'pending' || fee.status === 'overdue')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    document.getElementById('totalDue').textContent = `$${totalDue.toFixed(2)}`;
    document.getElementById('nextDueDate').textContent = nextDue 
        ? new Date(nextDue.dueDate).toLocaleDateString()
        : 'No pending payments';
}

function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'success';
        case 'pending':
            return 'warning';
        case 'overdue':
            return 'danger';
        default:
            return 'secondary';
    }
}

// This function is called from the onclick attribute in the fee status table
window.initiatePayment = function(feeId, amount) {
    currentPayment = { feeId, amount };
    document.getElementById('paymentAmount').value = amount;
    paymentModal.show();
};

function togglePaymentFields() {
    const method = paymentMethod.value;
    creditCardFields.style.display = method === 'credit_card' ? 'block' : 'none';
    bankTransferFields.style.display = method === 'bank_transfer' ? 'block' : 'none';
}

async function processPayment() {
    const method = paymentMethod.value;
    const amount = document.getElementById('paymentAmount').value;
    
    // Basic validation
    if (!currentPayment || !currentPayment.feeId) {
        showError('Invalid payment information');
        return;
    }

    // Validate payment method fields
    if (method === 'credit_card') {
        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        
        if (!cardNumber || !expiryDate || !cvv) {
            showError('Please fill in all credit card details');
            return;
        }
        
        // Basic card number validation
        if (cardNumber.replace(/\s/g, '').length !== 16 || !/^\d+$/.test(cardNumber.replace(/\s/g, ''))) {
            showError('Please enter a valid 16-digit card number');
            return;
        }
        
        // Basic expiry date validation
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            showError('Please enter a valid expiry date (MM/YY)');
            return;
        }
        
        // Basic CVV validation
        if (!/^\d{3,4}$/.test(cvv)) {
            showError('Please enter a valid CVV (3 or 4 digits)');
            return;
        }
    } else if (method === 'bank_transfer') {
        const bankName = document.getElementById('bankName').value;
        const accountNumber = document.getElementById('accountNumber').value;
        const accountTitle = document.getElementById('accountTitle').value;
        
        if (!bankName || !accountNumber || !accountTitle) {
            showError('Please fill in all bank transfer details');
            return;
        }
        
        // Basic account number validation
        if (accountNumber.length < 10 || !/^\d+$/.test(accountNumber)) {
            showError('Please enter a valid account number');
            return;
        }
    }

    try {
        // Prepare payment data based on method
        const paymentData = {
            feeId: currentPayment.feeId,
            amount,
            method
        };
        
        // Add method-specific data
        if (method === 'credit_card') {
            paymentData.cardDetails = {
                cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                expiryDate: document.getElementById('expiryDate').value,
                cvv: document.getElementById('cvv').value
            };
        } else if (method === 'bank_transfer') {
            paymentData.bankDetails = {
                bankName: document.getElementById('bankName').value,
                accountNumber: document.getElementById('accountNumber').value,
                accountTitle: document.getElementById('accountTitle').value
            };
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/payments/process`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                paymentModal.hide();
                showSuccess('Payment processed successfully');
                loadDashboardData();
            } else {
                showError(data.message || 'Payment processing failed');
            }
        } else {
            const error = await response.json();
            showError(error.message || 'Payment processing failed');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showError('Failed to process payment');
    }
}

function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function showError(message) {
    // Create and show error message
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

function showSuccess(message) {
    // Create and show success message
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

function updateNotifications(notifications) {
    if (notifications.length === 0) {
        notificationsContainer.innerHTML = '<div class="text-center py-3">No notifications</div>';
        return;
    }

    notificationsContainer.innerHTML = notifications.map((notification, index) => {
        // Adapt to the new schema
        const priorityClass = 'primary'; // Default since we don't have priority in the new schema
        const isUnread = notification.isRead === 0; // isRead is 0 for unread
        const formattedDate = new Date(notification.sentAt).toLocaleString();
        
        return `
            <div class="notification-item mb-3 p-3 border-start border-4 border-${priorityClass} ${isUnread ? 'bg-light' : ''}" 
                 style="animation-delay: ${index * 0.05}s; border-radius: 4px;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0 ${isUnread ? 'fw-bold' : ''}">${notification.subject}</h6>
                    ${isUnread ? '<span class="badge bg-primary">New</span>' : ''}
                </div>
                <p class="mb-2">${notification.message}</p>
                <div class="d-flex justify-content-between align-items-center small text-muted">
                    <span>From: ${notification.adminName || 'Admin'} | ${formattedDate}</span>
                    <div>
                        ${isUnread ? `
                            <button class="btn btn-sm btn-link p-0 me-2" onclick="markAsRead('${notification.id}')">
                                Mark as read
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteNotification('${notification.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateAllNotifications(notifications) {
    if (notifications.length === 0) {
        allNotificationsContainer.innerHTML = '<div class="text-center py-3">No notifications</div>';
        return;
    }

    allNotificationsContainer.innerHTML = notifications.map((notification, index) => {
        // Adapt to the new schema
        const priorityClass = 'primary'; // Default since we don't have priority in the new schema
        const isUnread = notification.isRead === 0; // isRead is 0 for unread
        const formattedDate = new Date(notification.sentAt).toLocaleString();
        
        return `
            <div class="notification-item mb-3 p-3 border-bottom ${isUnread ? 'bg-light' : ''}" 
                 style="animation-delay: ${index * 0.03}s;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0 ${isUnread ? 'fw-bold' : ''}">${notification.subject}</h6>
                    ${isUnread ? '<span class="badge bg-primary">New</span>' : ''}
                </div>
                <p class="mb-2">${notification.message}</p>
                <div class="d-flex justify-content-between align-items-center small text-muted">
                    <span>From: ${notification.adminName || 'Admin'} | ${formattedDate}</span>
                    <div>
                        ${isUnread ? `
                            <button class="btn btn-sm btn-link p-0 me-2" onclick="markAsRead('${notification.id}')">
                                Mark as read
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteNotification('${notification.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Function to mark a notification as read
window.markAsRead = async function(notificationId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // Reload notifications after marking as read
            const notificationsResponse = await fetchWithAuth(`${API_BASE_URL}/notifications/user`);
            const notificationsData = await notificationsResponse.json();
            
            if (notificationsData.success) {
                // Update stored notifications
                allNotifications = notificationsData.data || [];
                
                // Update both display views
                updateNotifications(allNotifications.slice(0, ITEMS_TO_SHOW));
                updateAllNotifications(allNotifications);
                
                showSuccess('Notification marked as read');
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showError('Failed to mark notification as read');
    }
};

// Function to delete a notification
window.deleteNotification = async function(notificationId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Reload notifications after deletion
            const notificationsResponse = await fetchWithAuth(`${API_BASE_URL}/notifications/user`);
            const notificationsData = await notificationsResponse.json();
            
            if (notificationsData.success) {
                // Update stored notifications
                allNotifications = notificationsData.data || [];
                
                // Update both display views
                updateNotifications(allNotifications.slice(0, ITEMS_TO_SHOW));
                updateAllNotifications(allNotifications);
                
                showSuccess('Notification deleted');
            }
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showError('Failed to delete notification');
    }
};

// Dark mode toggle function
function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
} 