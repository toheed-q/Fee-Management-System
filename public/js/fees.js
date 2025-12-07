export class FeeService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.token = localStorage.getItem('token') || null;
    }

    async createFee(feeType, amount, description, dueDate) {
        try {
            const response = await fetch(`${this.apiUrl}/fees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ feeType, amount, description, dueDate })
            });

            return await response.json();
        } catch (error) {
            console.error('Create fee error:', error);
            return { success: false, message: 'An error occurred while creating fee' };
        }
    }

    async getAllFees() {
        try {
            const response = await fetch(`${this.apiUrl}/fees/all`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get fees error:', error);
            return { success: false, message: 'An error occurred while fetching fees' };
        }
    }

    async getFeeStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/fees/status`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get fee status error:', error);
            return { success: false, message: 'An error occurred while fetching fee status' };
        }
    }

    async getFeeById(feeId) {
        try {
            const response = await fetch(`${this.apiUrl}/fees/${feeId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get fee error:', error);
            return { success: false, message: 'An error occurred while fetching fee details' };
        }
    }

    async updateFee(feeId, feeType, amount, description, dueDate) {
        try {
            const response = await fetch(`${this.apiUrl}/fees/${feeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ feeType, amount, description, dueDate })
            });

            return await response.json();
        } catch (error) {
            console.error('Update fee error:', error);
            return { success: false, message: 'An error occurred while updating fee' };
        }
    }

    async deleteFee(feeId) {
        try {
            const response = await fetch(`${this.apiUrl}/fees/${feeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Delete fee error:', error);
            return { success: false, message: 'An error occurred while deleting fee' };
        }
    }
} 