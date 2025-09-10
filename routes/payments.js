const express = require('express');
const PaymentEvent = require('../models/PaymentEvent');
const logger = require('../utils/logger');
const { validatePaymentQuery } = require('../utils/validation');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all payment events with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { error, value: queryParams } = validatePaymentQuery(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: error
      });
    }

    const {
      page,
      limit,
      status,
      source,
      currency,
      start_date,
      end_date,
      customer_email
    } = queryParams;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (currency) filter.currency = currency;
    if (customer_email) filter.customer_email = customer_email;
    
    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(start_date);
      if (end_date) filter.timestamp.$lte = new Date(end_date);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [payments, totalCount] = await Promise.all([
      PaymentEvent.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('-raw_event'), // Exclude raw_event for performance
      PaymentEvent.countDocuments(filter)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info('Payment events retrieved', {
      userId: req.user.id,
      filter,
      page,
      limit,
      totalCount
    });

    res.json({
      payments,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: totalCount,
        per_page: limit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      filters_applied: filter
    });

  } catch (error) {
    logger.error('Failed to retrieve payment events:', {
      error: error.message,
      userId: req.user.id,
      query: req.query
    });

    res.status(500).json({
      error: 'Failed to retrieve payments',
      message: 'Internal server error'
    });
  }
});

// Get specific payment event by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await PaymentEvent.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'No payment event found with the specified ID'
      });
    }

    logger.info('Payment event retrieved by ID', {
      userId: req.user.id,
      paymentId: req.params.id,
      transactionId: payment.transaction_id
    });

    res.json({ payment });

  } catch (error) {
    logger.error('Failed to retrieve payment by ID:', {
      error: error.message,
      userId: req.user.id,
      paymentId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to retrieve payment',
      message: 'Internal server error'
    });
  }
});

// Get payment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (start_date || end_date) {
      dateFilter.timestamp = {};
      if (start_date) dateFilter.timestamp.$gte = new Date(start_date);
      if (end_date) dateFilter.timestamp.$lte = new Date(end_date);
    }

    // Aggregate statistics
    const stats = await PaymentEvent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total_events: { $sum: 1 },
          successful_payments: {
            $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] }
          },
          failed_payments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          refunded_payments: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
          },
          total_amount: {
            $sum: { $cond: [{ $eq: ['$status', 'successful'] }, '$amount', 0] }
          },
          avg_amount: {
            $avg: { $cond: [{ $eq: ['$status', 'successful'] }, '$amount', null] }
          }
        }
      }
    ]);

    // Get stats by source
    const sourceStats = await PaymentEvent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] }
          },
          total_amount: {
            $sum: { $cond: [{ $eq: ['$status', 'successful'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Get stats by currency
    const currencyStats = await PaymentEvent.aggregate([
      { $match: { ...dateFilter, status: 'successful' } },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' }
        }
      },
      { $sort: { total_amount: -1 } }
    ]);

    const summary = stats[0] || {
      total_events: 0,
      successful_payments: 0,
      failed_payments: 0,
      refunded_payments: 0,
      total_amount: 0,
      avg_amount: 0
    };

    logger.info('Payment statistics retrieved', {
      userId: req.user.id,
      dateFilter,
      totalEvents: summary.total_events
    });

    res.json({
      summary,
      by_source: sourceStats,
      by_currency: currencyStats,
      success_rate: summary.total_events > 0 
        ? ((summary.successful_payments / summary.total_events) * 100).toFixed(2) + '%'
        : '0%',
      period: {
        start_date: start_date || 'all time',
        end_date: end_date || 'present'
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve payment statistics:', {
      error: error.message,
      userId: req.user.id,
      query: req.query
    });

    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: 'Internal server error'
    });
  }
});

// Admin-only: Delete payment event
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const payment = await PaymentEvent.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'No payment event found with the specified ID'
      });
    }

    logger.warn('Payment event deleted by admin', {
      adminId: req.user.id,
      paymentId: req.params.id,
      transactionId: payment.transaction_id
    });

    res.json({
      message: 'Payment event deleted successfully',
      deleted_payment: {
        id: payment._id,
        transaction_id: payment.transaction_id,
        amount: payment.amount,
        currency: payment.currency
      }
    });

  } catch (error) {
    logger.error('Failed to delete payment event:', {
      error: error.message,
      adminId: req.user.id,
      paymentId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to delete payment',
      message: 'Internal server error'
    });
  }
});

// Search payments by transaction ID
router.get('/search/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const payment = await PaymentEvent.findOne({ 
      transaction_id: transactionId 
    });
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'No payment event found with the specified transaction ID'
      });
    }

    logger.info('Payment found by transaction ID', {
      userId: req.user.id,
      transactionId,
      paymentId: payment._id
    });

    res.json({ payment });

  } catch (error) {
    logger.error('Failed to search payment by transaction ID:', {
      error: error.message,
      userId: req.user.id,
      transactionId: req.params.transactionId
    });

    res.status(500).json({
      error: 'Failed to search payment',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
