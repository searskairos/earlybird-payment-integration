# Earlybird Payment Integration Backend

A Node.js backend module that receives and records payment event data from third-party payment gateways (Stripe and Airwallex) into an internal accounting ledger system.

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐    ┌─────────────────┐
│   Payment       │     │   Node.js        │    │   MongoDB       │
│   Gateway       │───▶│    Backend       │───▶│   Database      │
│ (Stripe/Airwallex)    │    Server        │    │   Ledger        │
└─────────────────┘     └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Google OAuth   │
                       │   Authentication │
                       └──────────────────┘
```

## 🚀 Features

- **Webhook Processing**: Secure webhook endpoints for Stripe and Airwallex payment events
- **Event Types Supported**: 
  - `payment_successful`
  - `payment_failed` 
  - `refund_processed`
- **Authentication**: Google OAuth2.0 integration with JWT tokens
- **Data Storage**: MongoDB with comprehensive payment event tracking
- **Security**: Webhook signature verification, rate limiting, input validation
- **Deduplication**: Automatic duplicate event detection and handling
- **Admin Dashboard**: Protected endpoints for payment analytics and management
- **Comprehensive Logging**: Winston-based logging with multiple log levels

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Google OAuth2.0 credentials
- Stripe/Airwallex webhook secrets

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/searskairos/Earlybird_Payment_Integration.git
cd Earlybird_Payment_Integration
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/earlybird_payments

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Webhook Security
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
AIRWALLEX_WEBHOOK_SECRET=your_airwallex_webhook_secret_here
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. If needed, Configure the OAuth Consent Screen
5. Create OAuth2.0 credentials
6. Add authorized redirect URIs: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 4. Database Setup

Ensure MongoDB is running locally or update `MONGODB_URI` for remote database:

```bash
# Start MongoDB locally (if installed)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### 5. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### `GET /auth/google`
Initiates Google OAuth2.0 authentication flow.

#### `GET /auth/google/callback`
Handles Google OAuth callback and returns JWT token.

**Response:**
```json
{
  "message": "Authentication successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "jwt_token_here",
  "expires_in": "24h"
}
```

#### `GET /auth/profile`
Get current user profile (requires authentication).

### Webhook Endpoints

#### `POST /webhooks/payment`
Receives payment events from Stripe or Airwallex.

**Headers:**
- `stripe-signature` (for Stripe webhooks)
- `x-signature` (for Airwallex webhooks)

**Stripe Event Example:**
```json
{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 2000,
      "currency": "usd",
      "created": 1640995200,
      "receipt_email": "customer@example.com"
    }
  }
}
```

**Response:**
```json
{
  "message": "Webhook processed successfully",
  "transaction_id": "pi_1234567890",
  "status": "successful",
  "processed_at": "2024-01-01T12:00:00.000Z"
}
```

### Payment Management Endpoints (Protected)

#### `GET /payments`
Retrieve payment events with filtering and pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `status` (successful, failed, refunded)
- `source` (stripe, airwallex)
- `currency` (USD, EUR, etc.)
- `start_date` (ISO date)
- `end_date` (ISO date)
- `customer_email`

#### `GET /payments/:id`
Get specific payment event by ID.

#### `GET /payments/stats/summary`
Get payment statistics and analytics.

#### `GET /payments/search/:transactionId`
Search payment by transaction ID.

## 🔒 Security Features

### Webhook Security
- **Signature Verification**: All webhooks are verified using HMAC-SHA256
- **Rate Limiting**: 50 requests per minute for webhooks
- **Input Validation**: Comprehensive payload validation using Joi

### Authentication Security
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Role-Based Access**: Admin-only endpoints for sensitive operations
- **Secure Headers**: Helmet.js for security headers

### Data Security
- **Input Sanitization**: All inputs are validated and sanitized
- **Duplicate Prevention**: SHA-256 hashing for duplicate detection
- **Audit Logging**: Comprehensive logging of all operations

## 📊 Data Model

### PaymentEvent Schema
```javascript
{
  transaction_id: String (unique, indexed),
  amount: Number (in smallest currency unit),
  currency: String (3-letter code),
  status: Enum ['successful', 'failed', 'refunded'],
  timestamp: Date (indexed),
  source: Enum ['stripe', 'airwallex'],
  customer_email: String (optional),
  raw_event: Object (original webhook payload),
  processed_at: Date,
  duplicate_check: String (SHA-256 hash),
  webhook_id: String,
  metadata: Object
}
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The tests cover:
- Webhook processing for both Stripe and Airwallex
- Duplicate event handling
- Authentication flows
- Input validation
- Error scenarios

## 📝 Logging

Logs are written to multiple files in the `logs/` directory:
- `error.log` - Error level logs only
- `combined.log` - All logs
- `payments.log` - Payment-specific operations

Log levels: `error`, `warn`, `info`, `debug`

## 🔧 Design Decisions & Assumptions

### Technology Choices
- **MongoDB**: Chosen for flexible schema to handle varying webhook payloads
- **Express.js**: Lightweight and well-documented web framework
- **Passport.js**: Mature authentication middleware with Google OAuth support
- **Winston**: Comprehensive logging with multiple transports

### Architecture Decisions
1. **Stateless Authentication**: JWT tokens for scalability
2. **Event Sourcing**: Store complete webhook payloads for audit trails
3. **Duplicate Prevention**: Hash-based deduplication to handle webhook retries
4. **Modular Structure**: Separate routes, models, and utilities for maintainability

### Assumptions
- Payment amounts are provided in smallest currency unit (cents for USD)
- Webhook signatures are provided in headers as documented by providers
- MongoDB is preferred over SQLite for production scalability
- Admin users need to be manually assigned the 'admin' role in the database

## 🤖 AI Tools Usage

This project was developed with assistance from AI tools:

### ChatGPT/Claude Usage:
- **Code Structure**: Generated initial project scaffolding and Express.js boilerplate
- **Webhook Processing**: Helped design event mapping logic for Stripe/Airwallex differences
- **Security Implementation**: Assisted with JWT authentication and webhook signature verification
- **Documentation**: Generated comprehensive API documentation and setup instructions
- **Testing**: Created test cases and Jest configuration

### AI-Assisted Development Benefits:
- Rapid prototyping of complex authentication flows
- Best practices for Node.js security implementations
- Comprehensive error handling patterns
- Documentation generation and formatting

### Manual Development:
- Business logic and payment event processing
- Database schema design and optimization
- Integration testing and debugging
- Environment configuration and deployment setup

## 🚀 Future Improvements

Given more time, I would enhance the project with:

### Technical Improvements
1. **Caching Layer**: Redis for frequently accessed payment data
2. **Message Queue**: Bull/Agenda for reliable webhook processing
3. **Database Migrations**: Automated schema versioning
4. **API Versioning**: Support for multiple API versions
5. **GraphQL API**: More flexible data querying
6. **Microservices**: Split into separate services for auth, webhooks, and reporting

### Monitoring & Observability
1. **Metrics Collection**: Prometheus/Grafana for system metrics
2. **Distributed Tracing**: Jaeger for request tracing
3. **Health Checks**: Comprehensive health monitoring
4. **Alerting**: PagerDuty integration for critical failures

### Security Enhancements
1. **API Rate Limiting**: Per-user rate limiting
2. **Encryption**: Field-level encryption for sensitive data
3. **Audit Trails**: Complete audit logging for compliance
4. **RBAC**: More granular role-based permissions
