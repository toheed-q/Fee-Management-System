// Global variables
let currentUser = null;
const API_BASE_URL = 'http://localhost:3000/api';
let darkMode = localStorage.getItem('darkMode') === 'enabled';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerLink = document.getElementById('registerLink');
const loginLink = document.getElementById('loginLink');
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const regUserType = document.getElementById('regUserType');

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegistration);
registerLink.addEventListener('click', showRegistrationForm);
loginLink.addEventListener('click', showLoginForm);

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    createThemeToggle();
});

// Theme Functions
function initTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function toggleTheme() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
    
    updateThemeToggle();
}

function createThemeToggle() {
    // Create theme toggle element
    const themeToggle = document.createElement('div');
    themeToggle.className = darkMode ? 'theme-toggle dark' : 'theme-toggle';
    themeToggle.id = 'themeToggle';
    themeToggle.innerHTML = `
        <i class="fas fa-sun"></i>
        <i class="fas fa-moon"></i>
        <span class="toggle-thumb"></span>
    `;
    themeToggle.addEventListener('click', toggleTheme);
    
    // Add Font Awesome if not already present
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fontAwesome);
    }
    
    // Add to navbar or create a floating toggle
    const navbar = document.querySelector('.navbar .container');
    if (navbar) {
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'ms-auto';
        toggleWrapper.appendChild(themeToggle);
        navbar.appendChild(toggleWrapper);
    } else {
        // Create floating toggle if navbar not found
        themeToggle.style.position = 'fixed';
        themeToggle.style.top = '20px';
        themeToggle.style.right = '20px';
        themeToggle.style.zIndex = '1000';
        document.body.appendChild(themeToggle);
    }
}

function updateThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        if (darkMode) {
            themeToggle.classList.add('dark');
        } else {
            themeToggle.classList.remove('dark');
        }
    }
}

// Functions
function showRegistrationForm(event) {
    event.preventDefault();
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
    
    // Add animation class
    registerCard.classList.add('register-animation');
}

function showLoginForm(event) {
    event.preventDefault();
    registerCard.style.display = 'none';
    loginCard.style.display = 'block';
    
    // Add animation class
    loginCard.classList.add('login-animation');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;

    // Clear any existing error messages
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    try {
        console.log('Attempting login...', { email, userType }); // Debug log

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, userType })
        });

        const data = await response.json();
        console.log('Login response:', { status: response.status, data }); // Debug log

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            console.log('Login successful, redirecting...'); // Debug log
            redirectToDashboard(userType);
        } else {
            console.error('Login failed:', data.message); // Debug log
            showError(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error); // Debug log
        showError('An error occurred during login. Please try again.');
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const userType = document.getElementById('regUserType').value;

    // Validate password match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name,
                email, 
                password, 
                userType 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Registration successful! Please login.');
            showLoginForm(event);
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('An error occurred during registration');
    }
}

function redirectToDashboard(userType) {
    console.log('Redirecting to dashboard for user type:', userType); // Debug log
    if (userType === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'parent-dashboard.html';
    }
}

function showError(message) {
    // Create and show error message
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.card-body').prepend(alertDiv);
}

function showSuccess(message) {
    // Create and show success message
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.card-body').prepend(alertDiv);
} 