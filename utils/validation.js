const Joi = require('joi');

// Validation schema for webhook payload
const webhookPayloadSchema = Joi.object({
  transaction_id: Joi.string().required().min(1).max(255),
  amount: Joi.number().required().min(0),
  currency: Joi.string().required().length(3).uppercase(),
  status: Joi.string().required().valid('successful', 'failed', 'refunded'),
  timestamp: Joi.date().required(),
  source: Joi.string().required().valid('stripe', 'airwallex'),
  customer_email: Joi.string().email().optional().allow(null, ''),
  raw_event: Joi.object().required(),
  webhook_id: Joi.string().optional(),
  metadata: Joi.object().optional()
});

// Validation schema for payment query parameters
const paymentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('successful', 'failed', 'refunded').optional(),
  source: Joi.string().valid('stripe', 'airwallex').optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  customer_email: Joi.string().email().optional()
});

// Validate webhook payload
const validateWebhookPayload = (data) => {
  const { error } = webhookPayloadSchema.validate(data);
  return error ? error.details[0].message : null;
};

// Validate payment query parameters
const validatePaymentQuery = (query) => {
  const { error, value } = paymentQuerySchema.validate(query);
  if (error) {
    return { error: error.details[0].message, value: null };
  }
  return { error: null, value };
};

// Sanitize and validate email
const validateEmail = (email) => {
  if (!email) return null;
  
  const emailSchema = Joi.string().email().lowercase().trim();
  const { error, value } = emailSchema.validate(email);
  
  return error ? null : value;
};

// Validate currency code
const validateCurrency = (currency) => {
  const validCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW'
  ];
  
  if (!currency || typeof currency !== 'string') {
    return false;
  }
  
  return validCurrencies.includes(currency.toUpperCase());
};

// Validate amount (should be in smallest currency unit, e.g., cents)
const validateAmount = (amount, currency) => {
  if (typeof amount !== 'number' || amount < 0) {
    return false;
  }
  
  // Some currencies don't have fractional units
  const noFractionalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
  
  if (noFractionalCurrencies.includes(currency?.toUpperCase())) {
    return Number.isInteger(amount);
  }
  
  return true;
};

// Validate transaction ID format
const validateTransactionId = (transactionId, source) => {
  if (!transactionId || typeof transactionId !== 'string') {
    return false;
  }
  
  // Basic format validation based on source
  switch (source) {
    case 'stripe':
      return /^(pi_|ch_|in_)[a-zA-Z0-9]{24,}$/.test(transactionId);
    case 'airwallex':
      return /^[a-zA-Z0-9_-]{10,}$/.test(transactionId);
    default:
      return transactionId.length >= 5 && transactionId.length <= 255;
  }
};

module.exports = {
  validateWebhookPayload,
  validatePaymentQuery,
  validateEmail,
  validateCurrency,
  validateAmount,
  validateTransactionId,
  webhookPayloadSchema,
  paymentQuerySchema
};
