/**
 * School Fee Management System
 * Animation Utilities
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initializeAnimations();
    
    // Add scroll animations
    addScrollAnimations();
    
    // Add hover effects
    addHoverEffects();
});

/**
 * Initialize basic animations
 */
function initializeAnimations() {
    // Add animation classes to elements that should animate on page load
    const animatedElements = document.querySelectorAll('.card, .btn-primary, .dashboard-card');
    
    animatedElements.forEach(element => {
        // Add transition effect
        element.style.transition = 'all 0.3s ease';
        
        // Add subtle entrance animation if not already animated
        if (!element.classList.contains('login-animation') && 
            !element.classList.contains('register-animation') &&
            !element.classList.contains('dashboard-animation')) {
            element.classList.add('fadeInUp');
        }
    });
    
    // Add button click effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

/**
 * Add scroll-triggered animations
 */
function addScrollAnimations() {
    // Get all elements that should animate on scroll
    const scrollAnimElements = document.querySelectorAll(
        '.payment-history-item, .dashboard-card, .notification-item, .table tbody tr'
    );
    
    // Check if element is in viewport and add animation
    function checkInView() {
        scrollAnimElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // If element is in viewport
            if (elementPosition.top < windowHeight - 50) {
                if (!element.classList.contains('animated')) {
                    element.classList.add('animated', 'fadeInUp');
                    
                    // Add staggered delay effect for table rows
                    if (element.tagName === 'TR') {
                        const index = Array.from(element.parentNode.children).indexOf(element);
                        element.style.animationDelay = `${index * 0.1}s`;
                    }
                }
            }
        });
    }
    
    // Check on load and scroll
    checkInView();
    window.addEventListener('scroll', checkInView);
}

/**
 * Add hover effects to elements
 */
function addHoverEffects() {
    // Add hover effect to cards
    const cards = document.querySelectorAll('.card:not(.login-animation):not(.register-animation)');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = 'var(--shadow-md)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = 'var(--shadow-sm)';
        });
    });
    
    // Add effect to table rows
    const tableRows = document.querySelectorAll('.table tbody tr');
    
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = 'var(--shadow-md)';
            this.style.zIndex = '10';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = 'var(--shadow-sm)';
            this.style.zIndex = '';
        });
    });
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });
}

/**
 * Create ripple effect for button clicks
 */
function createRippleEffect(event) {
    const button = event.currentTarget;
    
    // Create ripple element
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    
    // Position the ripple
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    // Style the ripple
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    // Add to button and clean up after animation
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

/**
 * Add animation classes to notifications
 */
function animateNotifications() {
    const notifications = document.querySelectorAll('.notification-item');
    
    notifications.forEach((notification, index) => {
        // Add staggered animation
        notification.style.animationDelay = `${index * 0.1}s`;
        notification.classList.add('fadeInUp');
        
        // Add pulse effect to new notifications
        if (notification.querySelector('.badge-danger')) {
            notification.querySelector('.badge').classList.add('badge-float');
        }
    });
}

/**
 * Add number counter animation
 * @param {string} elementId - The ID of the element to animate
 * @param {number} targetValue - The final value to count to
 * @param {number} duration - Animation duration in milliseconds
 */
function animateCounter(elementId, targetValue, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
    const increment = targetValue / (duration / 16); // 60fps
    let currentValue = startValue;
    
    const counter = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            element.textContent = formatNumber(targetValue);
            clearInterval(counter);
        } else {
            element.textContent = formatNumber(Math.floor(currentValue));
        }
    }, 16);
}

/**
 * Format a number with commas
 */
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Make functions globally available
window.FeeAnimations = {
    animateCounter,
    animateNotifications
};
