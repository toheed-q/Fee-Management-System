# School Fee Management System
# A comprehensive documentation Including UML diagrams is available with the file name Documentation.pdf
A comprehensive web-based School Fee Management System that automates and streamlines fee collection, tracking, and reporting for educational institutions.

## Features

- User authentication (Admin and Parent roles)
- Fee structure management
- Online fee payment processing
- Payment history tracking
- Automated payment reminders
- Real-time dashboard for admins
- Payment status tracking for parents
- Secure payment processing
- Concurrent payment handling
- Transaction locking for data integrity

## Technology Stack

- **Frontend**:
  - HTML5 / CSS3
  - JavaScript (ES6+)
  - Bootstrap 5 for responsive UI
  - Single Page Application (SPA) architecture

- **Backend**:
  - Node.js with Express
  - RESTful API
  - JWT for authentication
  - SQLite3 for database

- **Security Features**:
  - Password hashing with bcrypt
  - JWT token-based authentication
  - Input validation
  - Transaction locking to prevent race conditions

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup Instructions

1. Clone the repository:
```
git clone <repository-url>
cd school-fee-management
```

2. Install dependencies:
```
npm install
```

3. Initialize the database:
```
npm run setup
```

4. Start the server:
```
npm start
```

5. Access the application:
```
http://localhost:3000
```

### Default Admin Credentials

After database initialization, you can log in with these credentials:
- Email: admin@school.com
- Password: admin123

## Application Structure

```
├── db                    # Database files
├── middleware            # Express middleware
├── models                # Data models
├── public                # Static assets
│   ├── css               # CSS stylesheets
│   ├── js                # JavaScript files
│   └── index.html        # Main HTML file
├── routes                # API routes
├── package.json          # Project dependencies
├── server.js             # Main server file
└── setup.js              # Database setup script
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login

### Fee Management
- `POST /api/fees` - Create new fee (Admin only)
- `GET /api/fees/all` - Get all fees (Admin only)
- `GET /api/fees/status` - Get fee status for parent
- `GET /api/fees/:id` - Get fee details
- `PUT /api/fees/:id` - Update fee (Admin only)
- `DELETE /api/fees/:id` - Delete fee (Admin only)

### Payment Processing
- `POST /api/payments/process` - Process payment
- `GET /api/payments/history` - Get payment history for parent
- `GET /api/payments/all` - Get all payments (Admin only)
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments/dashboard/summary` - Get dashboard summary (Admin only)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 
