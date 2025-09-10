const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentEventSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  status: {
    type: String,
    required: true,
    enum: ['successful', 'failed', 'refunded'],
    lowercase: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['stripe', 'airwallex'],
    lowercase: true
  },
  customer_email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  raw_event: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processed_at: {
    type: Date,
    default: Date.now
  },
  duplicate_check: {
    type: String,
    unique: true,
    index: true
  },
  webhook_id: {
    type: String,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate duplicate check hash
paymentEventSchema.pre('save', function(next) {
  if (!this.duplicate_check) {
    const hashString = `${this.transaction_id}-${this.amount}-${this.currency}-${this.source}`;
    this.duplicate_check = crypto.createHash('sha256').update(hashString).digest('hex');
  }
  next();
});

// Virtual for formatted amount
paymentEventSchema.virtual('formatted_amount').get(function() {
  return `${this.currency} ${(this.amount / 100).toFixed(2)}`;
});

// Static method to find duplicates
paymentEventSchema.statics.findDuplicate = function(transactionId, amount, currency, source) {
  const hashString = `${transactionId}-${amount}-${currency}-${source}`;
  const duplicateHash = crypto.createHash('sha256').update(hashString).digest('hex');
  return this.findOne({ duplicate_check: duplicateHash });
};

// Instance method to check if event is recent
paymentEventSchema.methods.isRecent = function(minutes = 30) {
  const now = new Date();
  const eventTime = new Date(this.timestamp);
  const diffMinutes = (now - eventTime) / (1000 * 60);
  return diffMinutes <= minutes;
};

// Indexes for performance
paymentEventSchema.index({ source: 1, status: 1 });
paymentEventSchema.index({ timestamp: -1 });
paymentEventSchema.index({ customer_email: 1 });
paymentEventSchema.index({ processed_at: -1 });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
