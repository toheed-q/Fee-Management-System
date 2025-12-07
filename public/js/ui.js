export class UIService {
    constructor() {
        this.alertContainer = document.createElement('div');
        this.alertContainer.className = 'alert-container position-fixed top-0 end-0 p-3';
        this.alertContainer.style.zIndex = '9999';
        document.body.appendChild(this.alertContainer);
    }

    // Show an alert message
    showAlert(message, type = 'info', timeout = 3000) {
        const alertId = 'alert-' + Date.now();
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.id = alertId;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        this.alertContainer.appendChild(alertDiv);
        
        // Auto-dismiss after timeout
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.classList.remove('show');
                
                // Remove from DOM after animation
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 300);
            }
        }, timeout);
    }

    // Format currency amount
    formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Show loading spinner
    showSpinner(targetElement) {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-primary';
        spinner.setAttribute('role', 'status');
        spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
        
        targetElement.innerHTML = '';
        targetElement.appendChild(spinner);
    }

    // Hide loading spinner
    hideSpinner(targetElement) {
        targetElement.innerHTML = '';
    }
} 