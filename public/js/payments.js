export class PaymentService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.token = localStorage.getItem('token') || null;
    }

    async processPayment(feeId, amount, method) {
        try {
            const response = await fetch(`${this.apiUrl}/payments/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ feeId, amount, method })
            });

            return await response.json();
        } catch (error) {
            console.error('Process payment error:', error);
            return { success: false, message: 'An error occurred while processing payment' };
        }
    }

    async getPaymentHistory() {
        try {
            const response = await fetch(`${this.apiUrl}/payments/history`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get payment history error:', error);
            return { success: false, message: 'An error occurred while fetching payment history' };
        }
    }

    async getAllPayments() {
        try {
            const response = await fetch(`${this.apiUrl}/payments/all`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get all payments error:', error);
            return { success: false, message: 'An error occurred while fetching payments' };
        }
    }

    async getPaymentById(paymentId) {
        try {
            const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get payment details error:', error);
            return { success: false, message: 'An error occurred while fetching payment details' };
        }
    }

    async getDashboardSummary() {
        try {
            const response = await fetch(`${this.apiUrl}/payments/dashboard/summary`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get dashboard summary error:', error);
            return { 
                success: false, 
                message: 'An error occurred while fetching dashboard summary',
                data: {
                    summary: { totalCollected: 0, completedPayments: 0, pendingPayments: 0 },
                    recentPayments: []
                }
            };
        }
    }
} 