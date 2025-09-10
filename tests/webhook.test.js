const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const PaymentEvent = require('../models/PaymentEvent');

describe('Webhook Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/earlybird_payments_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear payment events before each test
    await PaymentEvent.deleteMany({});
  });

  describe('POST /webhooks/payment', () => {
    const mockStripeEvent = {
      id: 'evt_test_webhook',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_12345',
          amount: 2000,
          currency: 'usd',
          created: Math.floor(Date.now() / 1000),
          receipt_email: 'test@example.com'
        }
      }
    };

    const mockAirwallexEvent = {
      id: 'evt_airwallex_test',
      name: 'payment_intent.succeeded',
      data: {
        id: 'int_test_67890',
        amount: 25.00,
        currency: 'USD',
        created_at: new Date().toISOString(),
        customer: {
          email: 'test@airwallex.com'
        }
      }
    };

    it('should process Stripe webhook successfully', async () => {
      const response = await request(app)
        .post('/webhooks/payment')
        .set('stripe-signature', 'test_signature')
        .send(mockStripeEvent);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(response.body.transaction_id).toBe('pi_test_12345');

      // Verify payment was saved to database
      const savedPayment = await PaymentEvent.findOne({ transaction_id: 'pi_test_12345' });
      expect(savedPayment).toBeTruthy();
      expect(savedPayment.amount).toBe(2000);
      expect(savedPayment.currency).toBe('USD');
      expect(savedPayment.status).toBe('successful');
      expect(savedPayment.source).toBe('stripe');
    });

    it('should process Airwallex webhook successfully', async () => {
      const response = await request(app)
        .post('/webhooks/payment')
        .set('x-airwallex-signature', 'test_signature')
        .send(mockAirwallexEvent);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(response.body.transaction_id).toBe('int_test_67890');

      // Verify payment was saved to database
      const savedPayment = await PaymentEvent.findOne({ transaction_id: 'int_test_67890' });
      expect(savedPayment).toBeTruthy();
      expect(savedPayment.amount).toBe(2500); // Converted to cents
      expect(savedPayment.currency).toBe('USD');
      expect(savedPayment.status).toBe('successful');
      expect(savedPayment.source).toBe('airwallex');
    });

    it('should handle duplicate events', async () => {
      // First request
      await request(app)
        .post('/webhooks/payment')
        .set('stripe-signature', 'test_signature')
        .send(mockStripeEvent);

      // Duplicate request
      const response = await request(app)
        .post('/webhooks/payment')
        .set('stripe-signature', 'test_signature')
        .send(mockStripeEvent);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event already processed');

      // Verify only one payment exists
      const paymentCount = await PaymentEvent.countDocuments({ transaction_id: 'pi_test_12345' });
      expect(paymentCount).toBe(1);
    });

    it('should reject webhook without signature', async () => {
      const response = await request(app)
        .post('/webhooks/payment')
        .send(mockStripeEvent);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No signature provided');
    });
  });

  describe('GET /webhooks/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.supported_sources).toContain('stripe');
      expect(response.body.supported_sources).toContain('airwallex');
    });
  });
});
