# Webhook Registration Guide

This guide explains how to register your webhook endpoint with Stripe and Airwallex to receive payment events.

## Prerequisites

1. **Your webhook endpoint is running**: `http://localhost:3000/webhooks/payment`
2. **Public URL required**: Payment gateways need to reach your endpoint via HTTPS
3. **Use ngrok for local development**: Exposes your local server to the internet

## Step 1: Expose Your Local Server (Development)

### Install and Setup ngrok

1. **Download ngrok**: Visit [ngrok.com](https://ngrok.com) and create a free account
2. **Install ngrok**: Follow platform-specific instructions
3. **Authenticate**: `ngrok authtoken YOUR_AUTH_TOKEN`
4. **Expose your server**:
   ```bash
   ngrok http 3000
   ```
5. **Copy the HTTPS URL**: Something like `https://abc123.ngrok.io`

Your webhook URL will be: `https://abc123.ngrok.io/webhooks/payment`

## Step 2: Register Webhook with Stripe

### Via Stripe Dashboard

1. **Login to Stripe Dashboard**: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Navigate to Webhooks**: Go to Developers → Webhooks
3. **Add Endpoint**: Click "Add endpoint"
4. **Configure Endpoint**:
   - **Endpoint URL**: `https://your-ngrok-url.ngrok.io/webhooks/payment`
   - **Description**: "Earlybird AI Payment Events"
   - **Version**: Latest API version

5. **Select Events to Listen For**:
   ```
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `refund.updated`
   ```

6. **Save Endpoint**: Click "Add endpoint"
7. **Copy Webhook Secret**: 
   - Click on your newly created endpoint
   - Copy the "Signing secret" (starts with `whsec_`)
   - Update your `.env` file: `STRIPE_WEBHOOK_SECRET=whsec_your_secret_here`

### Via Stripe CLI (Alternative)

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/payment
```

## Step 3: Register Webhook with Airwallex

### Via Airwallex Dashboard

1. **Login to Airwallex**: [https://www.airwallex.com/app1/dashboard](https://www.airwallex.com/app1/dashboard)
2. **Navigate to Webhooks**: Go to Developer → Webhooks → Summary
3. **Add Webhook**: Click "Add Webhook"
4. **Configure Webhook**:
   - **Notification URL**: `https://your-ngrok-url.ngrok.io/webhooks/payment`
   - **Description**: "Earlybird AI Payment Integration"

5. **Select Events**:
   ```
   ✅ payment_intent.succeeded
   ✅ payment_attempt.authorization_failed
   ✅ payment_attempt.capture_failed
   ✅ refund.settled
   ```

6. **Save Configuration**: Click "Save"
7. **Copy Webhook Secret**:
   - Find your webhook in the list
   - Copy the signing secret
   - Update your `.env` file: `AIRWALLEX_WEBHOOK_SECRET=your_airwallex_secret_here`

## Step 4: Test Your Webhooks

### Test Stripe Webhook

1. **Use Stripe Dashboard**:
   - Go to your webhook endpoint
   - Click "Send test webhook"
   - Select `payment_intent.succeeded`
   - Click "Send test webhook"

2. **Check Your Application Logs**:
   ```bash
   # Your application should log:
   info: Payment event processed successfully {
     "transaction_id": "pi_test_...",
     "amount": 2000,
     "currency": "USD",
     "status": "successful",
     "source": "stripe"
   }
   ```

### Test Airwallex Webhook

1. **Use Airwallex Dashboard**:
   - Go to Developer → Webhooks
   - Click on your webhook
   - Click "Test event" button
   - Select `payment_intent.succeeded`
   - Click "Send test"

2. **Verify in Application**:
   - Check logs for successful processing
   - Verify data is stored in MongoDB

## Step 5: Production Deployment

### For Production Environment

1. **Deploy to Cloud Provider** (Heroku, AWS, etc.)
2. **Update Webhook URLs** in both Stripe and Airwallex dashboards
3. **Use Production Secrets** (not test/sandbox secrets)
4. **Enable HTTPS** (required by both providers)

### Example Production URLs
```
Stripe Webhook URL: https://your-app.herokuapp.com/webhooks/payment
Airwallex Webhook URL: https://your-app.herokuapp.com/webhooks/payment
```

## Step 6: Verify Setup

### Check Webhook Deliveries

**Stripe Dashboard**:
- Go to Webhooks → Your endpoint
- Check "Recent deliveries" tab
- Look for successful 200 responses

**Airwallex Dashboard**:
- Go to Developer → Webhooks → Your webhook
- Check delivery history
- Verify successful responses

### Monitor Your Application

1. **Check Application Logs**:
   ```bash
   tail -f logs/payments.log
   ```

2. **Verify Database Storage**:
   ```bash
   # Connect to MongoDB and check
   use earlybird_payments
   db.paymentevents.find().limit(5)
   ```

3. **Test API Endpoints**:
   ```bash
   # Get payments (requires authentication)
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3000/payments
   ```

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**:
   - Check if ngrok is still running
   - Verify webhook URL is correct
   - Check firewall settings

2. **Signature Verification Failed**:
   - Verify webhook secrets in `.env`
   - Check that secrets match dashboard values
   - Ensure raw body is being used for verification

3. **Database Connection Issues**:
   - Verify MongoDB is running
   - Check connection string in `.env`
   - Look for connection errors in logs

### Debug Commands

```bash
# Check webhook endpoint health
curl https://your-ngrok-url.ngrok.io/webhooks/health

# Check application health
curl http://localhost:3000/health

# View recent logs
tail -f logs/combined.log
```

## Security Considerations

1. **Always verify webhook signatures** (implemented in the application)
2. **Use HTTPS in production** (required by payment providers)
3. **Implement rate limiting** (already configured)
4. **Monitor for suspicious activity** (check logs regularly)
5. **Keep webhook secrets secure** (never commit to version control)

## Event Types Reference

### Event Type Table

| Event Type | Description | When to Use |
|------------|-------------|-------------|
| `payment_intent.succeeded` | Payment completed successfully | Track successful payments |
| `payment_intent.payment_failed` | Payment failed | Handle payment failures |
| `refund.updated` | Refund status changed (we only process succeeded) | Track successful refunds |

### Stripe Events
- `payment_intent.succeeded` → `successful`
- `payment_intent.payment_failed` → `failed`
- `refund.updated` (status: succeeded) → `refunded`

### Airwallex Events
- `payment_intent.succeeded` → `successful`
- `payment_attempt.authorization_failed` → `failed`
- `payment_attempt.capture_failed` → `failed`
- `refund.settled` → `refunded`

Your webhook endpoint at `/webhooks/payment` automatically handles both Stripe and Airwallex events and maps them to the standardized format in your database.
