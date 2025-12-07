// Global variables
const API_BASE_URL = 'http://localhost:3000/api';
let feeStructureModal;
let parentsModal;
let assignFeeModal;
let reportModal;
let allTransactionsModal;
let notificationModal;
let currentUser = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');
let selectedParent = null;
let darkMode = localStorage.getItem('darkMode') === 'enabled'; // Dark mode state

// Debug logging for authentication
console.log('Admin Dashboard - Authentication check:');
console.log('Current User:', currentUser);
console.log('Token:', token ? `${token.substring(0, 15)}...` : 'No token');
console.log('Is admin user:', currentUser && currentUser.userType === 'admin');

// Pagination variables for transactions
let currentTransactionsPage = 1;
let totalTransactionsPages = 1;
let currentTransactionsFilters = {
    search: '',
    status: '',
    dateFilter: ''
};

// Check if user is logged in and is admin
if (!currentUser || !token || currentUser.userType !== 'admin') {
    console.log('Authentication failed:', { currentUser, token }); // Debug log
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
const setupFeeBtn = document.getElementById('setupFeeBtn');
const viewParentsBtn = document.getElementById('viewParentsBtn');
const generateReportBtn = document.getElementById('generateReportBtn');
const viewAllTransactionsBtn = document.getElementById('viewAllTransactionsBtn');
const sendRemindersBtn = document.getElementById('sendRemindersBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveFeeStructureBtn = document.getElementById('saveFeeStructure');
const saveAssignFeeBtn = document.getElementById('saveAssignFee');
const transactionsTable = document.getElementById('transactionsTable');
const allTransactionsTable = document.getElementById('allTransactionsTable');
const parentsTable = document.getElementById('parentsTable');
const adminNameDisplay = document.getElementById('adminNameDisplay');
const adminName = document.getElementById('adminName');
const pageLoader = document.getElementById('pageLoader');
const exportReportBtn = document.getElementById('exportReportBtn');
const prevTransactionsPage = document.getElementById('prevTransactionsPage');
const nextTransactionsPage = document.getElementById('nextTransactionsPage');
const transactionPaginationInfo = document.getElementById('transactionPaginationInfo');
const transactionSearchInput = document.getElementById('transactionSearchInput');
const transactionStatusFilter = document.getElementById('transactionStatusFilter');
const transactionDateFilter = document.getElementById('transactionDateFilter');
const applyTransactionFilters = document.getElementById('applyTransactionFilters');
const sendNotificationBtn = document.getElementById('sendNotificationBtn');
const notificationRecipient = document.getElementById('notificationRecipient');
const individualParentsSection = document.getElementById('individualParentsSection');
const parentCheckboxes = document.getElementById('parentCheckboxes');
const darkModeToggle = document.getElementById('darkModeToggle');

// DOM Elements for Side Menu
const sideMenu = document.getElementById('sideMenu');
const sideMenuToggle = document.getElementById('sideMenuToggle');
const closeSideMenu = document.getElementById('closeSideMenu');
const viewUnpaidParentsBtn = document.getElementById('viewUnpaidParentsBtn');
const viewOverdueParentsBtn = document.getElementById('viewOverdueParentsBtn');
const sendRemindersFromSideBtn = document.getElementById('sendRemindersFromSideBtn');
const unpaidParentsModal = new bootstrap.Modal(document.getElementById('unpaidParentsModal'));
const overdueParentsModal = new bootstrap.Modal(document.getElementById('overdueParentsModal'));
const unpaidParentsTable = document.getElementById('unpaidParentsTable');
const overdueParentsTable = document.getElementById('overdueParentsTable');
const sendRemindersToUnpaidBtn = document.getElementById('sendRemindersToUnpaidBtn');
const sendRemindersToOverdueBtn = document.getElementById('sendRemindersToOverdueBtn');

// Display admin name
if (currentUser && currentUser.name) {
    adminNameDisplay.textContent = `Welcome, ${currentUser.name}`;
    adminName.textContent = currentUser.name;
}

// Initialize Bootstrap modals
document.addEventListener('DOMContentLoaded', () => {
    feeStructureModal = new bootstrap.Modal(document.getElementById('feeStructureModal'));
    parentsModal = new bootstrap.Modal(document.getElementById('parentsModal'));
    assignFeeModal = new bootstrap.Modal(document.getElementById('assignFeeModal'));
    reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
    allTransactionsModal = new bootstrap.Modal(document.getElementById('allTransactionsModal'));
    notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
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
setupFeeBtn.addEventListener('click', () => feeStructureModal.show());
viewParentsBtn.addEventListener('click', loadAndShowParents);
generateReportBtn.addEventListener('click', generateReport);
viewAllTransactionsBtn.addEventListener('click', loadAndShowAllTransactions);
sendRemindersBtn.addEventListener('click', openNotificationModal);
logoutBtn.addEventListener('click', handleLogout);
saveFeeStructureBtn.addEventListener('click', saveFeeStructure);
saveAssignFeeBtn.addEventListener('click', saveAssignedFee);
sendNotificationBtn.addEventListener('click', sendNotification);
darkModeToggle.addEventListener('click', toggleDarkMode);

// Pagination and filter event listeners
if (prevTransactionsPage) {
    prevTransactionsPage.addEventListener('click', () => {
        if (currentTransactionsPage > 1) {
            currentTransactionsPage--;
            loadAllTransactions();
        }
    });
}

if (nextTransactionsPage) {
    nextTransactionsPage.addEventListener('click', () => {
        if (currentTransactionsPage < totalTransactionsPages) {
            currentTransactionsPage++;
            loadAllTransactions();
        }
    });
}

if (applyTransactionFilters) {
    applyTransactionFilters.addEventListener('click', () => {
        currentTransactionsFilters = {
            search: transactionSearchInput.value.trim(),
            status: transactionStatusFilter.value,
            dateFilter: transactionDateFilter.value
        };
        currentTransactionsPage = 1; // Reset to first page on filter change
        loadAllTransactions();
    });
}

// Add event listener for notification recipient change
if (notificationRecipient) {
    notificationRecipient.addEventListener('change', () => {
        if (notificationRecipient.value === 'individual') {
            individualParentsSection.style.display = 'block';
            loadParentsForNotification();
        } else {
            individualParentsSection.style.display = 'none';
        }
    });
}

// Apply dark mode if it was enabled
if (darkMode) {
    document.body.classList.add('dark-mode');
}

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

// Functions
async function loadDashboardData() {
    try {
        // Use the correct payment dashboard endpoint
        const response = await fetchWithAuth(`${API_BASE_URL}/payments/dashboard/summary`);

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Failed to load dashboard data');
        }

        const dashboardData = await response.json();
        
        if (!dashboardData.success) {
            throw new Error(dashboardData.message || 'Failed to load dashboard data');
        }

        const { summary, recentPayments } = dashboardData.data;

        // Update overview cards
        document.getElementById('totalCollected').textContent = `$${summary.totalCollected || 0}`;
        document.getElementById('pendingPayments').textContent = summary.pendingPayments || 0;
        document.getElementById('overduePayments').textContent = summary.overduePayments || 0; // Using actual overdue count

        // Update transactions table
        if (recentPayments && recentPayments.length > 0) {
            updateTransactionsTable(recentPayments);
        } else {
            transactionsTable.innerHTML = '<tr><td colspan="4" class="text-center">No recent transactions</td></tr>';
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

async function loadAndShowParents() {
    try {
        parentsTable.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        parentsModal.show();
        
        const response = await fetchWithAuth(`${API_BASE_URL}/auth/parents`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showError('You do not have permission to view this data');
                return;
            }
            throw new Error('Failed to load parents data');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load parents data');
        }
        
        updateParentsTable(data.data);
    } catch (error) {
        console.error('Error loading parents:', error);
        parentsTable.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load parents data</td></tr>';
    }
}

function updateParentsTable(parents) {
    if (!parents || parents.length === 0) {
        parentsTable.innerHTML = '<tr><td colspan="4" class="text-center">No parents registered yet</td></tr>';
        return;
    }
    
    parentsTable.innerHTML = parents.map((parent, index) => `
        <tr style="animation-delay: ${index * 0.05}s">
            <td>${parent.name || 'N/A'}</td>
            <td>${parent.email}</td>
            <td>${new Date(parent.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary payment-btn" onclick="assignFeeToParent('${parent.id}', '${parent.name}')">
                    Assign Fee
                </button>
            </td>
        </tr>
    `).join('');
}

function updateTransactionsTable(transactions) {
    transactionsTable.innerHTML = transactions.map((transaction, index) => `
        <tr style="animation-delay: ${index * 0.05}s">
            <td>${new Date(transaction.paymentDate).toLocaleDateString()}</td>
            <td>${transaction.userName || 'Unknown'}</td>
            <td>$${transaction.amount}</td>
            <td>
                <span class="badge bg-${getStatusBadgeClass(transaction.status)}">
                    ${transaction.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    if (!status) return 'secondary';
    
    switch (status.toLowerCase()) {
        case 'completed':
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

async function saveFeeStructure() {
    const feeType = document.getElementById('feeType').value;
    const amount = document.getElementById('feeAmount').value;
    const dueDate = document.getElementById('dueDate').value;
    const description = document.getElementById('feeDescription')?.value || '';

    try {
        // Use the correct fee structure endpoint
        const response = await fetchWithAuth(`${API_BASE_URL}/fees`, {
            method: 'POST',
            body: JSON.stringify({ feeType, amount, dueDate, description })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                feeStructureModal.hide();
                showSuccess('Fee structure created successfully');
                loadDashboardData();
            } else {
                showError(data.message || 'Failed to save fee structure');
            }
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save fee structure');
        }
    } catch (error) {
        console.error('Error saving fee structure:', error);
        showError('Failed to save fee structure');
    }
}

async function generateReport() {
    try {
        // Show the report modal with loading indicators
        reportModal.show();
        
        // Clear previous data and show loading message
        document.getElementById('userSummaryTable').innerHTML = 
            '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        document.getElementById('unpaidFeesTable').innerHTML = 
            '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        document.getElementById('paymentDetailsTable').innerHTML = 
            '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        
        // Fetch report data from API
        const response = await fetchWithAuth(`${API_BASE_URL}/payments/report`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showError('You do not have permission to access this report');
                return;
            }
            
            // Try to get a more detailed error message
            let errorMessage = 'Failed to generate report';
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to generate report');
        }
        
        // Ensure data has the expected structure
        if (!data.data || typeof data.data !== 'object') {
            throw new Error('Invalid data format received from server');
        }
        
        // Update the tables with the report data
        updateReportTables(data.data);
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Failed to generate report: ' + error.message);
        
        // Show error in tables
        document.getElementById('userSummaryTable').innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger">Failed to load report data</td></tr>';
        document.getElementById('unpaidFeesTable').innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger">Failed to load report data</td></tr>';
        document.getElementById('paymentDetailsTable').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load report data</td></tr>';
    }
}

function updateReportTables(reportData) {
    const { userSummary, paymentDetails, unpaidFees } = reportData;
    
    // Update user summary table
    if (userSummary && userSummary.length > 0) {
        document.getElementById('userSummaryTable').innerHTML = userSummary.map((user, index) => `
            <tr style="animation-delay: ${index * 0.05}s">
                <td>${user.userName || 'N/A'}</td>
                <td>${user.userEmail || 'N/A'}</td>
                <td>${user.totalPaymentsMade || 0}</td>
                <td>$${parseFloat(user.totalAmountPaid || 0).toFixed(2)}</td>
                <td>${user.pendingPaymentsCount || 0}</td>
            </tr>
        `).join('');
    } else {
        document.getElementById('userSummaryTable').innerHTML = 
            '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    }
    
    // Update unpaid fees table
    if (unpaidFees && unpaidFees.length > 0) {
        document.getElementById('unpaidFeesTable').innerHTML = unpaidFees.map((fee, index) => {
            // Format the due date, handling potential invalid date values
            let dueDateStr = 'N/A';
            if (fee.dueDate) {
                try {
                    dueDateStr = new Date(fee.dueDate).toLocaleDateString();
                } catch (e) {
                    console.warn('Invalid date format for due date:', fee.dueDate);
                }
            }
            
            return `
            <tr style="animation-delay: ${index * 0.05}s">
                <td>${fee.userName || 'N/A'}</td>
                <td>${fee.feeType || 'N/A'}</td>
                <td>$${parseFloat(fee.amount || 0).toFixed(2)}</td>
                <td>${fee.description || 'N/A'}</td>
                <td>${dueDateStr}</td>
            </tr>
            `;
        }).join('');
    } else {
        document.getElementById('unpaidFeesTable').innerHTML = 
            '<tr><td colspan="5" class="text-center">No unpaid fees found</td></tr>';
    }
    
    // Update payment details table
    if (paymentDetails && paymentDetails.length > 0) {
        document.getElementById('paymentDetailsTable').innerHTML = paymentDetails.map((payment, index) => {
            // Format the payment date, handling potential invalid date values
            let paymentDateStr = 'N/A';
            if (payment.paymentDate) {
                try {
                    paymentDateStr = new Date(payment.paymentDate).toLocaleDateString();
                } catch (e) {
                    console.warn('Invalid date format for payment date:', payment.paymentDate);
                }
            }
            
            return `
            <tr style="animation-delay: ${index * 0.05}s">
                <td>${payment.userName || 'N/A'}</td>
                <td>${payment.feeType || 'N/A'}</td>
                <td>$${parseFloat(payment.amount || 0).toFixed(2)}</td>
                <td>${paymentDateStr}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(payment.status || 'unknown')}">
                        ${payment.status || 'Unknown'}
                    </span>
                </td>
                <td>${payment.method || 'N/A'}</td>
                <td>${payment.transactionReference || 'N/A'}</td>
            </tr>
            `;
        }).join('');
    } else {
        document.getElementById('paymentDetailsTable').innerHTML = 
            '<tr><td colspan="7" class="text-center">No payment details found</td></tr>';
    }
}

async function sendPaymentReminders() {
    openNotificationModal();
}

// Function to open the notification modal
function openNotificationModal() {
    // Reset form
    document.getElementById('notificationForm').reset();
    notificationRecipient.value = 'all';
    individualParentsSection.style.display = 'none';
    
    // Show the modal
    notificationModal.show();
}

// Function to load parents for notification selection
async function loadParentsForNotification() {
    try {
        parentCheckboxes.innerHTML = '<div class="text-center py-2">Loading parents...</div>';
        
        const response = await fetchWithAuth(`${API_BASE_URL}/auth/parents`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                parentCheckboxes.innerHTML = '<div class="text-center py-2 text-danger">You do not have permission to view parents</div>';
                return;
            }
            throw new Error('Failed to load parents');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            parentCheckboxes.innerHTML = '<div class="text-center py-2 text-danger">Failed to load parents</div>';
            return;
        }
        
        if (data.data && data.data.length > 0) {
            parentCheckboxes.innerHTML = data.data.map(parent => `
                <div class="form-check mb-2">
                    <input class="form-check-input parent-checkbox" type="checkbox" value="${parent.id}" id="parent-${parent.id}">
                    <label class="form-check-label" for="parent-${parent.id}">
                        ${parent.name} (${parent.email})
                    </label>
                </div>
            `).join('');
        } else {
            parentCheckboxes.innerHTML = '<div class="text-center py-2">No parents found</div>';
        }
    } catch (error) {
        console.error('Error loading parents for notification:', error);
        parentCheckboxes.innerHTML = '<div class="text-center py-2 text-danger">Failed to load parents</div>';
    }
}

// Function to send notification
async function sendNotification() {
    try {
        const subject = document.getElementById('notificationSubject').value.trim();
        const message = document.getElementById('notificationMessage').value.trim();
        const priority = document.getElementById('notificationPriority').value;
        let recipients;
        
        if (!subject || !message) {
            showError('Subject and message are required');
            return;
        }
        
        if (notificationRecipient.value === 'all') {
            recipients = 'all';
        } else {
            // Get selected parents
            const selectedParents = Array.from(document.querySelectorAll('.parent-checkbox:checked')).map(checkbox => checkbox.value);
            
            if (selectedParents.length === 0) {
                showError('Please select at least one parent');
                return;
            }
            
            recipients = selectedParents;
        }
        
        // Log request details for debugging
        console.log('Sending notification with data:', {
            recipients,
            subject,
            message,
            priority
        });
        
        // Disable the send button and show loading state
        sendNotificationBtn.disabled = true;
        sendNotificationBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/notifications/send`, {
                method: 'POST',
                body: JSON.stringify({
                    recipients,
                    subject,
                    message,
                    priority
                })
            });
            
            // Re-enable the send button
            sendNotificationBtn.disabled = false;
            sendNotificationBtn.textContent = 'Send Notification';
            
            // Log response status for debugging
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response data:', errorData);
                throw new Error(errorData.message || 'Failed to send notification');
            }
            
            const data = await response.json();
            console.log('Success response data:', data);
            
            if (data.success) {
                notificationModal.hide();
                showSuccess(data.message || 'Notification sent successfully');
            } else {
                throw new Error(data.message || 'Failed to send notification');
            }
        } catch (fetchError) {
            console.error('Fetch error details:', fetchError);
            throw fetchError;
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        showError(error.message || 'Failed to send notification');
        
        // Re-enable the send button if it's still disabled
        sendNotificationBtn.disabled = false;
        sendNotificationBtn.textContent = 'Send Notification';
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

// Make the function accessible from the onclick attribute
window.assignFeeToParent = function(parentId, parentName) {
    selectedParent = {
        id: parentId,
        name: parentName
    };
    
    // Set default values for the form
    document.getElementById('assignParentName').value = parentName;
    document.getElementById('assignParentId').value = parentId;
    document.getElementById('assignFeeType').value = 'monthly';
    document.getElementById('assignFeeAmount').value = '';
    
    // Set default due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('assignDueDate').value = dueDate.toISOString().split('T')[0];
    
    document.getElementById('assignFeeDescription').value = '';
    
    // Hide parents modal and show assign fee modal
    parentsModal.hide();
    assignFeeModal.show();
};

async function saveAssignedFee() {
    const parentId = document.getElementById('assignParentId').value;
    const feeType = document.getElementById('assignFeeType').value;
    const amount = document.getElementById('assignFeeAmount').value;
    const dueDate = document.getElementById('assignDueDate').value;
    const description = document.getElementById('assignFeeDescription').value;
    
    // Basic validation
    if (!parentId || !feeType || !amount || !dueDate) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/fees/assign-to-parent`, {
            method: 'POST',
            body: JSON.stringify({
                parentId,
                feeType,
                amount,
                dueDate,
                description
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to assign fee');
        }
        
        const data = await response.json();
        
        if (data.success) {
            assignFeeModal.hide();
            showSuccess(`Fee successfully assigned to ${document.getElementById('assignParentName').value}`);
            loadDashboardData(); // Refresh dashboard data
        } else {
            throw new Error(data.message || 'Failed to assign fee');
        }
    } catch (error) {
        console.error('Error assigning fee:', error);
        showError(error.message || 'Failed to assign fee');
    }
}

// Add event listener for export button
if (exportReportBtn) {
    exportReportBtn.addEventListener('click', exportReportToCSV);
}

function exportReportToCSV() {
    try {
        // Get tables data
        const userSummaryTable = document.getElementById('userSummaryTable');
        const unpaidFeesTable = document.getElementById('unpaidFeesTable');
        const paymentDetailsTable = document.getElementById('paymentDetailsTable');
        
        if (!userSummaryTable || !unpaidFeesTable || !paymentDetailsTable) {
            throw new Error('Report tables not found');
        }
        
        // Generate CSV content for user summary
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add user summary section
        csvContent += "USER PAYMENT SUMMARY\r\n";
        csvContent += "Parent Name,Email,Payments Made,Total Amount Paid,Pending Payments\r\n";
        
        Array.from(userSummaryTable.querySelectorAll('tr')).forEach(row => {
            if (row.cells.length > 1) {  // Skip rows with colspan (e.g., "No users found")
                const rowData = Array.from(row.cells).map(cell => {
                    // Remove $ sign and other formatting from cell content
                    let content = cell.textContent.trim();
                    return `"${content.replace(/"/g, '""')}"`;
                });
                csvContent += rowData.join(',') + '\r\n';
            }
        });
        
        // Add a blank line between sections
        csvContent += '\r\n';
        
        // Add unpaid fees section
        csvContent += "UNPAID FEES\r\n";
        csvContent += "Parent Name,Fee Type,Amount,Description,Due Date\r\n";
        
        Array.from(unpaidFeesTable.querySelectorAll('tr')).forEach(row => {
            if (row.cells.length > 1) {
                const rowData = Array.from(row.cells).map(cell => {
                    let content = cell.textContent.trim();
                    return `"${content.replace(/"/g, '""')}"`;
                });
                csvContent += rowData.join(',') + '\r\n';
            }
        });
        
        // Add a blank line between sections
        csvContent += '\r\n';
        
        // Add payment details section
        csvContent += "PAYMENT DETAILS\r\n";
        csvContent += "Parent Name,Fee Type,Amount,Payment Date,Status,Method,Transaction Reference\r\n";
        
        Array.from(paymentDetailsTable.querySelectorAll('tr')).forEach(row => {
            if (row.cells.length > 1) {
                const rowData = Array.from(row.cells).map(cell => {
                    // Get text content and remove any HTML tags
                    let content = cell.textContent.trim();
                    return `"${content.replace(/"/g, '""')}"`;
                });
                csvContent += rowData.join(',') + '\r\n';
            }
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payment_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        showSuccess('Report exported successfully');
    } catch (error) {
        console.error('Error exporting report:', error);
        showError('Failed to export report: ' + error.message);
    }
}

async function loadAndShowAllTransactions() {
    allTransactionsModal.show();
    currentTransactionsPage = 1;
    loadAllTransactions();
}

async function loadAllTransactions() {
    try {
        allTransactionsTable.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading transactions...</td></tr>';
        
        // Build query parameters for filtering and pagination
        const params = new URLSearchParams({
            page: currentTransactionsPage,
            limit: 10
        });
        
        if (currentTransactionsFilters.search) {
            params.append('search', currentTransactionsFilters.search);
        }
        
        if (currentTransactionsFilters.status) {
            params.append('status', currentTransactionsFilters.status);
        }
        
        if (currentTransactionsFilters.dateFilter) {
            params.append('dateFilter', currentTransactionsFilters.dateFilter);
        }
        
        const response = await fetchWithAuth(`${API_BASE_URL}/payments/all-paginated?${params.toString()}`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showError('You do not have permission to view this data');
                return;
            }
            throw new Error('Failed to load transactions');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load transactions');
        }
        
        const { transactions, pagination } = data.data;
        
        // Update pagination controls
        currentTransactionsPage = pagination.page;
        totalTransactionsPages = pagination.pages;
        
        prevTransactionsPage.disabled = currentTransactionsPage <= 1;
        nextTransactionsPage.disabled = currentTransactionsPage >= totalTransactionsPages;
        
        // Update pagination info
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(start + transactions.length - 1, pagination.total);
        transactionPaginationInfo.textContent = `${start}-${end} of ${pagination.total}`;
        
        // Update transactions table
        updateAllTransactionsTable(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        allTransactionsTable.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load transactions</td></tr>';
        showError('Failed to load transactions: ' + error.message);
    }
}

function updateAllTransactionsTable(transactions) {
    if (!transactions || transactions.length === 0) {
        allTransactionsTable.innerHTML = '<tr><td colspan="8" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    allTransactionsTable.innerHTML = transactions.map((transaction, index) => {
        // Format the payment date
        let paymentDateStr = 'N/A';
        if (transaction.paymentDate) {
            try {
                paymentDateStr = new Date(transaction.paymentDate).toLocaleString();
            } catch (e) {
                console.warn('Invalid date format:', transaction.paymentDate);
            }
        }
        
        // Format the due date
        let dueDateStr = 'N/A';
        if (transaction.dueDate) {
            try {
                dueDateStr = new Date(transaction.dueDate).toLocaleDateString();
            } catch (e) {
                console.warn('Invalid date format:', transaction.dueDate);
            }
        }
        
        return `
            <tr class="transaction-row" style="animation-delay: ${index * 0.05}s">
                <td>${paymentDateStr}</td>
                <td>${transaction.userName || 'N/A'}</td>
                <td>${transaction.userEmail || 'N/A'}</td>
                <td>${transaction.feeType || 'N/A'}</td>
                <td>$${parseFloat(transaction.amount || 0).toFixed(2)}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(transaction.status)}">
                        ${transaction.status || 'Unknown'}
                    </span>
                </td>
                <td>${transaction.method || 'N/A'}</td>
                <td>${transaction.transactionReference || 'N/A'}</td>
            </tr>
        `;
    }).join('');
}

// Side Menu Toggle
let sideMenuOpen = false;
function toggleSideMenu() {
    if (sideMenuOpen) {
        sideMenu.style.left = '-250px';
        sideMenuToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
    } else {
        sideMenu.style.left = '0';
        sideMenuToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
    }
    sideMenuOpen = !sideMenuOpen;
}

// Event Listeners for Side Menu
sideMenuToggle.addEventListener('click', toggleSideMenu);
closeSideMenu.addEventListener('click', toggleSideMenu);
viewUnpaidParentsBtn.addEventListener('click', () => {
    loadUnpaidParents();
    toggleSideMenu();
});
viewOverdueParentsBtn.addEventListener('click', () => {
    loadOverdueParents();
    toggleSideMenu();
});
sendRemindersFromSideBtn.addEventListener('click', () => {
    openNotificationModal();
    toggleSideMenu();
});

// Function to load parents with unpaid fees
async function loadUnpaidParents() {
    try {
        unpaidParentsTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        unpaidParentsModal.show();
        
        const response = await fetchWithAuth(`${API_BASE_URL}/payments/unpaid-parents`);
        
        if (!response.ok) {
            throw new Error('Failed to load unpaid parents data');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load unpaid parents data');
        }
        
        updateUnpaidParentsTable(data.data);
    } catch (error) {
        console.error('Error loading unpaid parents:', error);
        unpaidParentsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load data</td></tr>';
        showError('Failed to load unpaid parents data: ' + error.message);
    }
}

// Function to load parents with overdue fees
async function loadOverdueParents() {
    try {
        overdueParentsTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        overdueParentsModal.show();
        
        const response = await fetchWithAuth(`${API_BASE_URL}/payments/overdue-parents`);
        
        if (!response.ok) {
            throw new Error('Failed to load overdue parents data');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load overdue parents data');
        }
        
        updateOverdueParentsTable(data.data);
    } catch (error) {
        console.error('Error loading overdue parents:', error);
        overdueParentsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load data</td></tr>';
        showError('Failed to load overdue parents data: ' + error.message);
    }
}

// Update unpaid parents table
function updateUnpaidParentsTable(parents) {
    if (!parents || parents.length === 0) {
        unpaidParentsTable.innerHTML = '<tr><td colspan="5" class="text-center">No parents with unpaid fees</td></tr>';
        return;
    }
    
    unpaidParentsTable.innerHTML = parents.map((parent, index) => `
        <tr style="animation-delay: ${index * 0.05}s" class="transaction-row">
            <td>${parent.name || 'N/A'}</td>
            <td>${parent.email}</td>
            <td>$${parseFloat(parent.pendingAmount || 0).toFixed(2)}</td>
            <td>${parent.pendingFees || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="assignFeeToParent('${parent.id}', '${parent.name}')">
                    <i class="fas fa-money-bill-alt"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="sendReminderToParent('${parent.id}', '${parent.name}')">
                    <i class="fas fa-bell"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Update overdue parents table
function updateOverdueParentsTable(parents) {
    if (!parents || parents.length === 0) {
        overdueParentsTable.innerHTML = '<tr><td colspan="5" class="text-center">No parents with overdue fees</td></tr>';
        return;
    }
    
    overdueParentsTable.innerHTML = parents.map((parent, index) => `
        <tr style="animation-delay: ${index * 0.05}s" class="transaction-row">
            <td>${parent.name || 'N/A'}</td>
            <td>${parent.email}</td>
            <td>$${parseFloat(parent.overdueAmount || 0).toFixed(2)}</td>
            <td>${parent.daysOverdue || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="assignFeeToParent('${parent.id}', '${parent.name}')">
                    <i class="fas fa-money-bill-alt"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="sendUrgentReminderToParent('${parent.id}', '${parent.name}')">
                    <i class="fas fa-exclamation-circle"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Send reminder to a specific parent
window.sendReminderToParent = function(parentId, parentName) {
    document.getElementById('notificationForm').reset();
    notificationRecipient.value = 'individual';
    // Set pre-filled values
    document.getElementById('notificationSubject').value = 'Payment Reminder';
    document.getElementById('notificationMessage').value = `Dear ${parentName},\n\nThis is a friendly reminder that you have pending fee payments. Please arrange for payment at your earliest convenience.\n\nThank you,\nSchool Administration`;
    document.getElementById('notificationPriority').value = 'normal';
    
    // Show individual parents section and check the specific parent
    individualParentsSection.style.display = 'block';
    loadParentsForNotification().then(() => {
        const checkbox = document.getElementById(`parent-${parentId}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Hide unpaid parents modal and show notification modal
    unpaidParentsModal.hide();
    notificationModal.show();
};

// Send urgent reminder to a specific parent
window.sendUrgentReminderToParent = function(parentId, parentName) {
    document.getElementById('notificationForm').reset();
    notificationRecipient.value = 'individual';
    // Set pre-filled values with urgent message
    document.getElementById('notificationSubject').value = 'URGENT: Overdue Payment Reminder';
    document.getElementById('notificationMessage').value = `Dear ${parentName},\n\nThis is an URGENT reminder that you have OVERDUE fee payments. Please arrange for immediate payment to avoid any further action.\n\nThank you,\nSchool Administration`;
    document.getElementById('notificationPriority').value = 'urgent';
    
    // Show individual parents section and check the specific parent
    individualParentsSection.style.display = 'block';
    loadParentsForNotification().then(() => {
        const checkbox = document.getElementById(`parent-${parentId}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Hide overdue parents modal and show notification modal
    overdueParentsModal.hide();
    notificationModal.show();
}; 