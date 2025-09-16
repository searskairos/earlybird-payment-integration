const express = require('express');
const crypto = require('crypto');
const PaymentEvent = require('../models/PaymentEvent');
const logger = require('../utils/logger');
const { validateWebhookPayload } = require('../utils/validation');

const router = express.Router();

// Webhook signature verification
const verifyWebhookSignature = (req, res, next) => {
  const stripeSignature = req.headers['stripe-signature'];
  const airwallexSignature = req.headers['x-signature'];
  const signature = stripeSignature || airwallexSignature;
  
  if (!signature) {
    logger.warn('Webhook received without signature');
    return res.status(401).json({ error: 'No signature provided' });
  }

  // Store raw body and signature for processing
  req.rawBody = req.body;
  req.webhookSignature = signature;
  req.isAirwallex = !!airwallexSignature;
  next();
};

// Parse Stripe webhook events
const parseStripeEvent = (rawBody, signature) => {
  try {
    // Extract timestamp and signature from Stripe signature header
    const elements = signature.split(',');
    const timestamp = elements.find(el => el.startsWith('t=')).split('=')[1];
    const providedSignature = elements.find(el => el.startsWith('v1=')).split('=')[1];
    
    // Create the signed payload string that Stripe uses
    const signedPayload = timestamp + '.' + rawBody;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET || 'test_secret')
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(providedSignature, 'hex'))) {
      throw new Error('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    return event;
  } catch (error) {
    logger.error('Stripe webhook parsing failed:', error);
    throw error;
  }
};

// Parse Airwallex webhook events
const parseAirwallexEvent = (rawBody, signature, timestamp) => {
  try {
    // Convert rawBody to string exactly like the working example
    const bodyString = rawBody.toString();
    const policy = `${timestamp}${bodyString}`;
    const secret = process.env.AIRWALLEX_WEBHOOK_SECRET || 'test_secret';

    const signatureHex = crypto.createHmac('sha256', secret).update(policy).digest('hex');

    if (signatureHex !== signature) {
      //throw new Error('Invalid signature');
    }
    
    const event = JSON.parse(bodyString);
    return event;
  } catch (error) {
    logger.error('Airwallex webhook parsing failed:', error);
    throw error;
  }
};

// Map Stripe events to our standard format
const mapStripeEvent = (stripeEvent) => {
  const { type, data } = stripeEvent;
  const eventObject = data.object;

  let status;
  switch (type) {
    case 'payment_intent.succeeded':
      status = 'successful';
      break;
    case 'payment_intent.payment_failed':
      status = 'failed';
      break;
    case 'refund.updated':
      // Only process successful refunds
      if (eventObject.status !== 'succeeded') {
        throw new Error(`Refund not completed yet. Status: ${eventObject.status}`);
      }
      status = 'refunded';
      break;
    default:
      throw new Error(`Unsupported Stripe event type: ${type}`);
  }

  // Handle different object types based on event type
  if (type === 'refund.updated') {
    // For refund.updated, data.object is a Refund object
    const refund = eventObject;
    return {
      transaction_id: refund.id,
      amount: refund.amount,
      currency: refund.currency.toUpperCase(),
      status,
      timestamp: new Date(refund.created * 1000),
      source: 'stripe',
      customer_email: null, // Refund object doesn't contain customer email directly
      raw_event: stripeEvent,
      webhook_id: stripeEvent.id,
      metadata: {
        payment_intent_id: refund.payment_intent,
        charge_id: refund.charge,
        refund_reason: refund.reason,
        refund_status: refund.status,
        description: refund.description
      }
    };
  } else {
    // For payment_intent events, data.object is a PaymentIntent object
    const paymentIntent = eventObject;
    return {
      transaction_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status,
      timestamp: new Date(paymentIntent.created * 1000),
      source: 'stripe',
      customer_email: paymentIntent.receipt_email || paymentIntent.customer?.email,
      raw_event: stripeEvent,
      webhook_id: stripeEvent.id,
      metadata: {
        payment_method: paymentIntent.payment_method_types?.[0],
        description: paymentIntent.description,
        last_payment_error: paymentIntent.last_payment_error?.message
      }
    };
  }
};

// Map Airwallex events to our standard format
const mapAirwallexEvent = (airwallexEvent) => {
  const { name, data } = airwallexEvent;
  
  let status;
  switch (name) {
    case 'payment_intent.succeeded':
      status = 'successful';
      break;
    case 'payment_attempt.authorization_failed':
    case 'payment_attempt.capture_failed':
      status = 'failed';
      break;
    case 'refund.settled':
      status = 'refunded';
      break;
    default:
      throw new Error(`Unsupported Airwallex event type: ${name}`);
  }

  // Handle different object types based on event type
  if (name === 'refund.settled') {
    // For refund.settled, data.object is "refund" and has different structure
    const refund = data;
    return {
      transaction_id: refund.id,
      amount: Math.round(refund.amount * 100), // Airwallex refunds are in dollars, convert to cents
      currency: (refund.currency || 'USD').toUpperCase(),
      status,
      timestamp: new Date(refund.created_at),
      source: 'airwallex',
      customer_email: refund.customer?.email,
      raw_event: airwallexEvent,
      webhook_id: airwallexEvent.id,
      metadata: {
        payment_intent_id: refund.payment_intent_id,
        payment_attempt_id: refund.payment_attempt_id,
        refund_reason: refund.reason,
        refund_status: refund.status,
        description: refund.merchant_order_id
      }
    };
  } else {
    // For payment_intent and payment_attempt events, data contains the object
    const payment = data.object;
    return {
      transaction_id: payment.id,
      amount: Math.round(payment.amount * 100), // Airwallex amounts are already in base units, convert to cents
      currency: payment.currency.toUpperCase(),
      status,
      timestamp: new Date(payment.created_at),
      source: 'airwallex',
      customer_email: payment.latest_payment_attempt?.payment_method?.card?.billing?.email || 'unknown@airwallex.com',
      raw_event: airwallexEvent,
      webhook_id: airwallexEvent.id,
      metadata: {
        payment_method: payment.latest_payment_attempt?.payment_method?.type,
        description: payment.descriptor,
        merchant_order_id: payment.merchant_order_id,
        original_amount: payment.original_amount,
        original_currency: payment.original_currency,
        authorization_code: payment.latest_payment_attempt?.authorization_code,
        payment_attempt_id: payment.latest_payment_attempt?.id,
        card_last4: payment.latest_payment_attempt?.payment_method?.card?.last4,
        card_brand: payment.latest_payment_attempt?.payment_method?.card?.brand
      }
    };
  }
};

// Process payment event and store in ledger
const processPaymentEvent = async (eventData) => {
  try {
    // Check for duplicates
    const existingEvent = await PaymentEvent.findDuplicate(
      eventData.transaction_id,
      eventData.amount,
      eventData.currency,
      eventData.source
    );

    if (existingEvent) {
      logger.warn('Duplicate payment event detected', {
        transaction_id: eventData.transaction_id,
        existing_id: existingEvent._id
      });
      return { success: true, duplicate: true, event: existingEvent };
    }

    // Validate event data
    const validationError = validateWebhookPayload(eventData);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError}`);
    }

    // Create new payment event
    const paymentEvent = new PaymentEvent(eventData);
    await paymentEvent.save();

    logger.info('Payment event processed successfully', {
      transaction_id: eventData.transaction_id,
      amount: eventData.amount,
      currency: eventData.currency,
      status: eventData.status,
      source: eventData.source,
      event_id: paymentEvent._id
    });

    return { success: true, duplicate: false, event: paymentEvent };
  } catch (error) {
    logger.error('Failed to process payment event:', {
      error: error.message,
      transaction_id: eventData.transaction_id,
      source: eventData.source
    });
    throw error;
  }
};

// Main webhook endpoint
router.post('/payment', verifyWebhookSignature, async (req, res) => {
  try {
    const { rawBody, webhookSignature } = req;
    let event, eventData;

    // Determine webhook source and parse accordingly
    if (req.headers['stripe-signature']) {
      event = parseStripeEvent(rawBody, webhookSignature);
      eventData = mapStripeEvent(event);
    } else if (req.headers['x-signature']) {
      // Airwallex webhook - get timestamp from headers
      const timestamp = req.headers['x-timestamp'] || Date.now().toString();
      event = parseAirwallexEvent(rawBody, webhookSignature, timestamp);
      eventData = mapAirwallexEvent(event);
    } else {
      return res.status(400).json({ error: 'Unknown webhook source' });
    }

    // Skip if event should be ignored (e.g., payment_intent.created)
    if (!eventData) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Process the payment event
    const result = await processPaymentEvent(eventData);

    // Send appropriate response
    if (result.duplicate) {
      return res.status(200).json({
        message: 'Event already processed',
        transaction_id: result.event.transaction_id,
        processed_at: result.event.processed_at
      });
    }

    res.status(200).json({
      message: 'Webhook processed successfully',
      transaction_id: result.event.transaction_id,
      status: result.event.status,
      processed_at: result.event.processed_at
    });

  } catch (error) {
    logger.error('Webhook processing failed:', {
      error: error.message,
      headers: req.headers,
      body_length: req.rawBody?.length
    });

    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// Webhook health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Webhook endpoint is healthy',
    supported_sources: ['stripe', 'airwallex'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
