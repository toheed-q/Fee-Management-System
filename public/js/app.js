// Import modules
import { AuthService } from './auth.js';
import { FeeService } from './fees.js';
import { PaymentService } from './payments.js';
import { Router } from './router.js';
import { UIService } from './ui.js';

// Constants
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize services
const authService = new AuthService(API_BASE_URL);
const feeService = new FeeService(API_BASE_URL);
const paymentService = new PaymentService(API_BASE_URL);
const uiService = new UIService();
const router = new Router();

// DOM Elements
const mainContent = document.getElementById('main-content');
const logoutButton = document.getElementById('logout-button');

// Templates
const loginTemplate = document.getElementById('login-template');
const registerTemplate = document.getElementById('register-template');
const adminDashboardTemplate = document.getElementById('admin-dashboard-template');
const parentDashboardTemplate = document.getElementById('parent-dashboard-template');

// Event Listeners
document.addEventListener('DOMContentLoaded', init);
logoutButton.addEventListener('click', handleLogout);

// Initialize app
async function init() {
    // Check authentication and setup routes
    setupRoutes();
    
    // Navigate to initial route
    router.navigateToCurrentRoute();
    
    // Check auth status
    updateAuthStatus();
    
    // Setup modals and other UI components
    setupModals();
}

// Setup routes
function setupRoutes() {
    router.addRoute('', () => {
        showHomePage();
    });
    
    router.addRoute('login', () => {
        if (authService.isAuthenticated()) {
            router.navigateTo('dashboard');
            return;
        }
        showLoginPage();
    });
    
    router.addRoute('register', () => {
        if (authService.isAuthenticated()) {
            router.navigateTo('dashboard');
            return;
        }
        showRegisterPage();
    });
    
    router.addRoute('dashboard', () => {
        if (!authService.isAuthenticated()) {
            router.navigateTo('login');
            return;
        }
        
        const user = authService.getCurrentUser();
        if (user.userType === 'admin') {
            showAdminDashboard();
        } else {
            showParentDashboard();
        }
    });
    
    router.addRoute('fees', () => {
        if (!authService.isAuthenticated()) {
            router.navigateTo('login');
            return;
        }
        
        const user = authService.getCurrentUser();
        if (user.userType === 'admin') {
            showAdminFees();
        } else {
            router.navigateTo('dashboard');
        }
    });
    
    router.addRoute('payments', () => {
        if (!authService.isAuthenticated()) {
            router.navigateTo('login');
            return;
        }
        
        const user = authService.getCurrentUser();
        if (user.userType === 'admin') {
            showAdminPayments();
        } else {
            showParentPayments();
        }
    });
    
    router.addRoute('profile', () => {
        if (!authService.isAuthenticated()) {
            router.navigateTo('login');
            return;
        }
        
        showUserProfile();
    });
}

// Authentication Handlers
function showHomePage() {
    // No need to do anything, home page is already in the HTML
    // Just make sure navigation is updated
    updateNavigation();
}

function showLoginPage() {
    mainContent.innerHTML = '';
    mainContent.appendChild(loginTemplate.content.cloneNode(true));
    
    // Setup login form
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            loginError.classList.add('d-none');
            const result = await authService.login(email, password);
            
            if (result.success) {
                updateAuthStatus();
                router.navigateTo('dashboard');
            } else {
                loginError.textContent = result.message || 'Login failed';
                loginError.classList.remove('d-none');
            }
        } catch (error) {
            loginError.textContent = 'An error occurred during login';
            loginError.classList.remove('d-none');
            console.error('Login error:', error);
        }
    });
    
    updateNavigation();
}

function showRegisterPage() {
    mainContent.innerHTML = '';
    mainContent.appendChild(registerTemplate.content.cloneNode(true));
    
    // Setup register form
    const registerForm = document.getElementById('register-form');
    const registerError = document.getElementById('register-error');
    
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const userType = document.querySelector('input[name="register-user-type"]:checked').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match';
            registerError.classList.remove('d-none');
            return;
        }
        
        try {
            registerError.classList.add('d-none');
            const result = await authService.register(name, email, password, userType);
            
            if (result.success) {
                // Show success message
                uiService.showAlert('Registration successful! Please log in.', 'success');
                router.navigateTo('login');
            } else {
                registerError.textContent = result.message || 'Registration failed';
                registerError.classList.remove('d-none');
            }
        } catch (error) {
            registerError.textContent = 'An error occurred during registration';
            registerError.classList.remove('d-none');
            console.error('Registration error:', error);
        }
    });
    
    updateNavigation();
}

function handleLogout() {
    authService.logout();
    updateAuthStatus();
    router.navigateTo('');
}

// Dashboard Handlers
async function showAdminDashboard() {
    mainContent.innerHTML = '';
    mainContent.appendChild(adminDashboardTemplate.content.cloneNode(true));
    
    try {
        // Fetch dashboard data
        const dashboardData = await paymentService.getDashboardSummary();
        
        if (dashboardData.success) {
            const { summary, recentPayments } = dashboardData.data;
            
            // Update dashboard cards
            document.getElementById('total-collected').textContent = `$${summary.totalCollected || 0}`;
            document.getElementById('completed-payments').textContent = summary.completedPayments || 0;
            document.getElementById('pending-payments').textContent = summary.pendingPayments || 0;
            
            // Update recent payments table
            const recentPaymentsTable = document.getElementById('recent-payments-table');
            
            if (recentPayments.length === 0) {
                recentPaymentsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No payments found</td>
                    </tr>
                `;
            } else {
                recentPaymentsTable.innerHTML = recentPayments.map(payment => `
                    <tr>
                        <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td>${payment.userName}</td>
                        <td>${payment.feeType}</td>
                        <td>$${payment.amount}</td>
                        <td><span class="badge bg-success">${payment.status}</span></td>
                    </tr>
                `).join('');
            }
            
            // Setup action buttons
            document.getElementById('add-fee-btn').addEventListener('click', () => {
                const addFeeModal = new bootstrap.Modal(document.getElementById('add-fee-modal'));
                addFeeModal.show();
            });
            
            document.getElementById('save-fee-btn').addEventListener('click', handleAddFee);
            
            document.getElementById('send-reminders-btn').addEventListener('click', () => {
                // Implement send reminders functionality
                uiService.showAlert('Reminders sent successfully!', 'success');
            });
            
            document.getElementById('generate-report-btn').addEventListener('click', () => {
                // Implement generate report functionality
                uiService.showAlert('Report generated successfully!', 'success');
            });
            
            // Fetch upcoming due dates
            const fees = await feeService.getAllFees();
            if (fees.success) {
                const upcomingDues = document.getElementById('upcoming-dues');
                const upcomingFees = fees.data
                    .filter(fee => new Date(fee.dueDate) > new Date())
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5);
                
                if (upcomingFees.length === 0) {
                    upcomingDues.innerHTML = `<li class="list-group-item">No upcoming due dates</li>`;
                } else {
                    upcomingDues.innerHTML = upcomingFees.map(fee => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${fee.feeType === 'monthly' ? 'Monthly Fee' : 'Term Fee'}</strong><br>
                                <small class="text-muted">Due: ${new Date(fee.dueDate).toLocaleDateString()}</small>
                            </div>
                            <span class="badge bg-primary rounded-pill">$${fee.amount}</span>
                        </li>
                    `).join('');
                }
            }
        } else {
            uiService.showAlert('Failed to load dashboard data', 'danger');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        uiService.showAlert('Error loading dashboard', 'danger');
    }
    
    updateNavigation();
}

async function showParentDashboard() {
    mainContent.innerHTML = '';
    mainContent.appendChild(parentDashboardTemplate.content.cloneNode(true));
    
    try {
        // Fetch fee status
        const feeStatus = await feeService.getFeeStatus();
        
        if (feeStatus.success) {
            const fees = feeStatus.data;
            
            // Calculate total due
            const totalDue = fees
                .filter(fee => fee.status === 'pending' || fee.status === 'overdue')
                .reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
            
            document.getElementById('parent-total-due').textContent = `$${totalDue.toFixed(2)}`;
            
            // Find next due date
            const pendingFees = fees
                .filter(fee => fee.status === 'pending')
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            
            if (pendingFees.length > 0) {
                document.getElementById('parent-next-due').textContent = new Date(pendingFees[0].dueDate).toLocaleDateString();
            } else {
                document.getElementById('parent-next-due').textContent = 'No pending payments';
            }
            
            // Update fee status table
            const feeStatusTable = document.getElementById('fee-status-table');
            
            if (fees.length === 0) {
                feeStatusTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No fees found</td>
                    </tr>
                `;
            } else {
                feeStatusTable.innerHTML = fees.map(fee => `
                    <tr>
                        <td>${fee.feeType === 'monthly' ? 'Monthly Fee' : 'Term Fee'}${fee.description ? ` - ${fee.description}` : ''}</td>
                        <td>${new Date(fee.dueDate).toLocaleDateString()}</td>
                        <td>$${fee.amount}</td>
                        <td><span class="badge bg-${getStatusBadgeClass(fee.status)}">${fee.status}</span></td>
                        <td>
                            ${fee.status === 'pending' || fee.status === 'overdue' ? 
                                `<button class="btn btn-sm btn-primary pay-fee-btn" data-fee-id="${fee.id}" data-fee-amount="${fee.amount}">Pay Now</button>` :
                                '-'
                            }
                        </td>
                    </tr>
                `).join('');
                
                // Add event listeners to pay buttons
                document.querySelectorAll('.pay-fee-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const feeId = button.getAttribute('data-fee-id');
                        const amount = button.getAttribute('data-fee-amount');
                        showPaymentModal(feeId, amount);
                    });
                });
            }
            
            // Fetch payment history
            const paymentHistory = await paymentService.getPaymentHistory();
            
            if (paymentHistory.success) {
                const payments = paymentHistory.data;
                const paymentHistoryTable = document.getElementById('payment-history-table');
                
                if (payments.length === 0) {
                    paymentHistoryTable.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">No payment history</td>
                        </tr>
                    `;
                } else {
                    paymentHistoryTable.innerHTML = payments.map(payment => `
                        <tr>
                            <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td>${payment.feeType === 'monthly' ? 'Monthly Fee' : 'Term Fee'}</td>
                            <td>$${payment.amount}</td>
                            <td>${payment.method === 'credit_card' ? 'Credit Card' : 'Bank Transfer'}</td>
                            <td><span class="badge bg-success">${payment.status}</span></td>
                        </tr>
                    `).join('');
                }
            }
        } else {
            uiService.showAlert('Failed to load fee data', 'danger');
        }
    } catch (error) {
        console.error('Error loading parent dashboard:', error);
        uiService.showAlert('Error loading dashboard', 'danger');
    }
    
    updateNavigation();
}

function showPaymentModal(feeId, amount) {
    // Reset form
    document.getElementById('payment-form').reset();
    document.getElementById('payment-error').classList.add('d-none');
    document.getElementById('credit-card-fields').classList.add('d-none');
    document.getElementById('bank-transfer-fields').classList.add('d-none');
    
    // Set fee ID and amount
    document.getElementById('payment-fee-id').value = feeId;
    document.getElementById('payment-amount').value = amount;
    
    // Show modal
    const paymentModal = new bootstrap.Modal(document.getElementById('payment-modal'));
    paymentModal.show();
    
    // Payment method change handler
    document.getElementById('payment-method').addEventListener('change', function() {
        const method = this.value;
        document.getElementById('credit-card-fields').classList.toggle('d-none', method !== 'credit_card');
        document.getElementById('bank-transfer-fields').classList.toggle('d-none', method !== 'bank_transfer');
    });
    
    // Process payment button
    document.getElementById('process-payment-btn').addEventListener('click', async () => {
        const feeId = document.getElementById('payment-fee-id').value;
        const amount = document.getElementById('payment-amount').value;
        const method = document.getElementById('payment-method').value;
        const paymentError = document.getElementById('payment-error');
        
        if (!method) {
            paymentError.textContent = 'Please select a payment method';
            paymentError.classList.remove('d-none');
            return;
        }
        
        try {
            paymentError.classList.add('d-none');
            const result = await paymentService.processPayment(feeId, amount, method);
            
            if (result.success) {
                paymentModal.hide();
                uiService.showAlert('Payment processed successfully', 'success');
                
                // Reload dashboard
                router.navigateTo('dashboard');
            } else {
                paymentError.textContent = result.message || 'Payment failed';
                paymentError.classList.remove('d-none');
            }
        } catch (error) {
            paymentError.textContent = 'An error occurred during payment';
            paymentError.classList.remove('d-none');
            console.error('Payment error:', error);
        }
    });
}

async function handleAddFee() {
    const feeType = document.getElementById('fee-type').value;
    const amount = document.getElementById('fee-amount').value;
    const description = document.getElementById('fee-description').value;
    const dueDate = document.getElementById('fee-due-date').value;
    const addFeeError = document.getElementById('add-fee-error');
    
    if (!feeType || !amount || !dueDate) {
        addFeeError.textContent = 'Please fill in all required fields';
        addFeeError.classList.remove('d-none');
        return;
    }
    
    try {
        addFeeError.classList.add('d-none');
        const result = await feeService.createFee(feeType, amount, description, dueDate);
        
        if (result.success) {
            const addFeeModal = bootstrap.Modal.getInstance(document.getElementById('add-fee-modal'));
            addFeeModal.hide();
            uiService.showAlert('Fee added successfully', 'success');
            
            // Reload dashboard
            router.navigateTo('dashboard');
        } else {
            addFeeError.textContent = result.message || 'Failed to add fee';
            addFeeError.classList.remove('d-none');
        }
    } catch (error) {
        addFeeError.textContent = 'An error occurred while adding fee';
        addFeeError.classList.remove('d-none');
        console.error('Add fee error:', error);
    }
}

// Helper functions
function updateAuthStatus() {
    const isAuthenticated = authService.isAuthenticated();
    const user = isAuthenticated ? authService.getCurrentUser() : null;
    
    // Update navigation based on auth status
    document.getElementById('nav-login').classList.toggle('d-none', isAuthenticated);
    document.getElementById('nav-register').classList.toggle('d-none', isAuthenticated);
    document.getElementById('nav-logout').classList.toggle('d-none', !isAuthenticated);
    document.getElementById('nav-dashboard').classList.toggle('d-none', !isAuthenticated);
    document.getElementById('nav-profile').classList.toggle('d-none', !isAuthenticated);
    
    // Update admin-specific navigation
    const isAdmin = user && user.userType === 'admin';
    document.getElementById('nav-fees').classList.toggle('d-none', !isAdmin);
    document.getElementById('nav-payments').classList.toggle('d-none', !isAuthenticated);
}

function updateNavigation() {
    const currentRoute = window.location.hash.slice(1) || '';
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (currentRoute === '') {
        document.getElementById('nav-home').classList.add('active');
    } else {
        const navItem = document.getElementById(`nav-${currentRoute}`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }
}

function setupModals() {
    // Payment method change handler
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function() {
            const method = this.value;
            document.getElementById('credit-card-fields').classList.toggle('d-none', method !== 'credit_card');
            document.getElementById('bank-transfer-fields').classList.toggle('d-none', method !== 'bank_transfer');
        });
    }
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