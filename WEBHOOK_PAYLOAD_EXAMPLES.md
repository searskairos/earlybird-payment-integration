# Webhook Payload Examples

This document shows the actual data structures you'll receive from Stripe and Airwallex webhook events.

## Stripe Webhook Payloads

### 1. Payment Intent Succeeded (`payment_intent.succeeded`)

```json
{
  "id": "evt_1OL2Ky2eZvKYlo2C8VzTxmNH",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1672531200,
  "data": {
    "object": {
      "id": "pi_3OL2Ky2eZvKYlo2C8VzTxmNH",
      "object": "payment_intent",
      "amount": 2000,
      "amount_capturable": 0,
      "amount_details": {
        "tip": {}
      },
      "amount_received": 2000,
      "application": null,
      "application_fee_amount": null,
      "automatic_payment_methods": null,
      "canceled_at": null,
      "cancellation_reason": null,
      "capture_method": "automatic",
      "client_secret": "pi_3OL2Ky2eZvKYlo2C8VzTxmNH_secret_xyz",
      "confirmation_method": "automatic",
      "created": 1672531200,
      "currency": "usd",
      "customer": "cus_N4qNOw5dQbxQmz",
      "description": "Payment for order #12345",
      "invoice": null,
      "last_payment_error": null,
      "latest_charge": "ch_3OL2Ky2eZvKYlo2C8VzTxmNH",
      "livemode": false,
      "metadata": {
        "order_id": "12345",
        "customer_id": "user_789"
      },
      "next_action": null,
      "on_behalf_of": null,
      "payment_method": "pm_1OL2Ky2eZvKYlo2C8VzTxmNH",
      "payment_method_options": {
        "card": {
          "installments": null,
          "mandate_options": null,
          "network": null,
          "request_three_d_secure": "automatic"
        }
      },
      "payment_method_types": ["card"],
      "processing": null,
      "receipt_email": "customer@example.com",
      "review": null,
      "setup_future_usage": null,
      "shipping": {
        "address": {
          "city": "San Francisco",
          "country": "US",
          "line1": "123 Market St",
          "line2": null,
          "postal_code": "94105",
          "state": "CA"
        },
        "carrier": null,
        "name": "John Doe",
        "phone": "+1234567890",
        "tracking_number": null
      },
      "source": null,
      "statement_descriptor": null,
      "statement_descriptor_suffix": null,
      "status": "succeeded",
      "transfer_data": null,
      "transfer_group": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_xyz123",
    "idempotency_key": null
  },
  "type": "payment_intent.succeeded"
}
```

### 2. Payment Intent Failed (`payment_intent.payment_failed`)

```json
{
  "id": "evt_1OL2Ky2eZvKYlo2C8VzTxmNH",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1672531200,
  "data": {
    "object": {
      "id": "pi_3OL2Ky2eZvKYlo2C8VzTxmNH",
      "object": "payment_intent",
      "amount": 2000,
      "currency": "usd",
      "customer": "cus_N4qNOw5dQbxQmz",
      "description": "Payment for order #12345",
      "last_payment_error": {
        "charge": "ch_3OL2Ky2eZvKYlo2C8VzTxmNH",
        "code": "card_declined",
        "decline_code": "insufficient_funds",
        "doc_url": "https://stripe.com/docs/error-codes/card-declined",
        "message": "Your card was declined.",
        "param": null,
        "payment_method": {
          "id": "pm_1OL2Ky2eZvKYlo2C8VzTxmNH",
          "object": "payment_method",
          "card": {
            "brand": "visa",
            "checks": {
              "address_line1_check": "pass",
              "address_postal_code_check": "pass",
              "cvc_check": "pass"
            },
            "country": "US",
            "exp_month": 12,
            "exp_year": 2025,
            "fingerprint": "xyz123",
            "funding": "credit",
            "last4": "4242",
            "networks": {
              "available": ["visa"],
              "preferred": null
            },
            "three_d_secure_usage": {
              "supported": true
            },
            "wallet": null
          },
          "created": 1672531200,
          "customer": "cus_N4qNOw5dQbxQmz",
          "livemode": false,
          "type": "card"
        },
        "type": "card_error"
      },
      "receipt_email": "customer@example.com",
      "status": "requires_payment_method",
      "created": 1672531200,
      "metadata": {
        "order_id": "12345"
      }
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_xyz123",
    "idempotency_key": null
  },
  "type": "payment_intent.payment_failed"
}
```

### 3. Refund Succeeded (`refund.updated`)

```json
{
  "id": "evt_1OL2Ky2eZvKYlo2C8VzTxmNH",
  "object": "event",
  "api_version": "2024-10-28.acacia",
  "created": 1672531200,
  "data": {
    "object": {
      "id": "re_1OL2Ky2eZvKYlo2C8VzTxmNH",
      "object": "refund",
      "amount": 1000,
      "balance_transaction": "txn_1OL2Ky2eZvKYlo2CYezqFhEx",
      "charge": "ch_3OL2Ky2eZvKYlo2C8VzTxmNH",
      "created": 1672531200,
      "currency": "usd",
      "destination_details": {
        "card": {
          "reference": "123456789012",
          "reference_status": "available",
          "reference_type": "acquirer_reference_number",
          "type": "refund"
        },
        "type": "card"
      },
      "failure_balance_transaction": null,
      "failure_reason": null,
      "instructions_email": null,
      "metadata": {
        "order_id": "12345",
        "refund_reason": "customer_request"
      },
      "next_action": null,
      "payment_intent": "pi_3OL2Ky2eZvKYlo2C8VzTxmNH",
      "pending_reason": null,
      "reason": "requested_by_customer",
      "receipt_number": null,
      "source_transfer_reversal": null,
      "status": "succeeded",
      "transfer_reversal": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_1OL2Ky2eZvKYlo2C8VzTxmNH",
    "idempotency_key": null
  },
  "type": "refund.updated"
}
```

## Airwallex Webhook Payloads

### 1. Payment Intent Succeeded (`payment_intent.succeeded`)

```json
{
  "id": "evt_hkdm0q2eur8cjn5000000",
  "name": "payment_intent.succeeded",
  "data": {
    "object": "payment_intent",
    "id": "int_hkdm0q2eur8cjn5000000",
    "request_id": "req_hkdm0q2eur8cjn5000000",
    "amount": 100.50,
    "base_amount": 100.50,
    "currency": "USD",
    "merchant_order_id": "order_12345",
    "order": {
      "type": "payment",
      "products": [
        {
          "code": "product_001",
          "name": "Premium Subscription",
          "desc": "Monthly premium subscription",
          "sku": "PREM_MONTHLY",
          "type": "Digital Service",
          "unit_price": 100.50,
          "url": "https://example.com/premium"
        }
      ]
    },
    "status": "SUCCEEDED",
    "captured_amount": 100.50,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:15.000Z",
    "available_payment_method_types": [
      "card"
    ],
    "customer": {
      "id": "cus_hkdm0q2eur8cjn5000000",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "additional_info": {
        "registered_via_social_media": false,
        "registration_date": "2023-12-01",
        "loyalty_member": true
      }
    },
    "customer_id": "cus_hkdm0q2eur8cjn5000000",
    "descriptor": "EARLYBIRD*SUBSCRIPTION",
    "metadata": {
      "user_id": "user_789",
      "subscription_type": "premium",
      "billing_cycle": "monthly"
    },
    "return_url": "https://example.com/return",
    "payment_method": {
      "id": "mtd_hkdm0q2eur8cjn5000000",
      "type": "card",
      "card": {
        "cvc_check": "pass",
        "avs_check": "unavailable",
        "bin": "424242",
        "last4": "4242",
        "brand": "visa",
        "country": "US",
        "funding": "credit",
        "fingerprint": "xyz123fingerprint",
        "issuer": "CHASE BANK USA, N.A.",
        "issuer_country": "US"
      }
    },
    "latest_payment_attempt": {
      "id": "att_hkdm0q2eur8cjn5000000",
      "amount": 100.50,
      "currency": "USD",
      "status": "SUCCEEDED",
      "captured_amount": 100.50,
      "refunded_amount": 0,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:15.000Z",
      "payment_method": {
        "type": "card",
        "card": {
          "last4": "4242",
          "brand": "visa"
        }
      }
    },
    "next_action": null,
    "client_secret": "int_hkdm0q2eur8cjn5000000_secret_xyz"
  },
  "account_id": "account_123456",
  "created_at": "2024-01-15T10:30:15.000Z"
}
```

### 2. Payment Attempt Authorization Failed (`payment_attempt.authorization_failed`)

```json
{
  "id": "evt_hkdm0q2eur8cjn5000001",
  "name": "payment_attempt.authorization_failed",
  "data": {
    "object": "payment_intent",
    "id": "int_hkdm0q2eur8cjn5000001",
    "request_id": "req_hkdm0q2eur8cjn5000001",
    "amount": 250.00,
    "base_amount": 250.00,
    "currency": "USD",
    "merchant_order_id": "order_12346",
    "status": "FAILED",
    "captured_amount": 0,
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:30.000Z",
    "customer": {
      "id": "cus_hkdm0q2eur8cjn5000001",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@example.com",
      "phone_number": "+1987654321"
    },
    "customer_id": "cus_hkdm0q2eur8cjn5000001",
    "descriptor": "EARLYBIRD*PAYMENT",
    "metadata": {
      "user_id": "user_456",
      "order_type": "one_time"
    },
    "return_url": "https://example.com/return",
    "payment_method": {
      "id": "mtd_hkdm0q2eur8cjn5000001",
      "type": "card",
      "card": {
        "last4": "0002",
        "brand": "visa",
        "country": "US",
        "funding": "credit"
      }
    },
    "latest_payment_attempt": {
      "id": "att_hkdm0q2eur8cjn5000001",
      "amount": 250.00,
      "currency": "USD",
      "status": "FAILED",
      "captured_amount": 0,
      "refunded_amount": 0,
      "created_at": "2024-01-15T11:00:00.000Z",
      "updated_at": "2024-01-15T11:00:30.000Z",
      "payment_method": {
        "type": "card",
        "card": {
          "last4": "0002",
          "brand": "visa"
        }
      },
      "payment_error": {
        "type": "card_error",
        "code": "card_declined",
        "message": "Your card was declined.",
        "decline_code": "insufficient_funds"
      }
    },
    "next_action": null,
    "client_secret": "int_hkdm0q2eur8cjn5000001_secret_abc"
  },
  "account_id": "account_123456",
  "created_at": "2024-01-15T11:00:30.000Z"
}
```

### 3. Refund Received (`refund.settled`)

```json
{
  "id": "evt_hkdm0q2eur8cjn5000002",
  "name": "refund.settled",
  "data": {
    "object": "refund",
    "id": "rfn_hkdm0q2eur8cjn5000002",
    "payment_attempt_id": "att_hkdm0q2eur8cjn5000000",
    "payment_intent_id": "int_hkdm0q2eur8cjn5000000",
    "amount": 50.25,
    "base_amount": 50.25,
    "currency": "USD",
    "reason": "requested_by_customer",
    "status": "SUCCEEDED",
    "created_at": "2024-01-15T14:30:00.000Z",
    "updated_at": "2024-01-15T14:30:15.000Z",
    "metadata": {
      "refund_reason": "customer_request",
      "support_ticket": "TKT-789",
      "processed_by": "support_agent_123"
    },
    "merchant_order_id": "order_12345",
    "customer": {
      "id": "cus_hkdm0q2eur8cjn5000000",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    }
  },
  "account_id": "account_123456",
  "created_at": "2024-01-15T14:30:15.000Z"
}
```

## How Your Application Processes This Data

### Data Extraction and Mapping

Your webhook handler in `routes/webhooks.js` extracts the following standardized fields:

```javascript
// For Stripe events
const mappedData = {
  transaction_id: "pi_3OL2Ky2eZvKYlo2C8VzTxmNH",
  amount: 2000, // in cents
  currency: "USD",
  status: "successful", // mapped from Stripe status
  timestamp: new Date(1672531200 * 1000),
  source: "stripe",
  customer_email: "customer@example.com",
  raw_event: { /* full Stripe payload */ },
  webhook_id: "evt_1OL2Ky2eZvKYlo2C8VzTxmNH",
  metadata: {
    payment_method: "card",
    description: "Payment for order #12345"
  }
}

// For Airwallex events
const mappedData = {
  transaction_id: "int_hkdm0q2eur8cjn5000000",
  amount: 10050, // converted to cents (100.50 * 100)
  currency: "USD",
  status: "successful", // mapped from Airwallex status
  timestamp: new Date("2024-01-15T10:30:00.000Z"),
  source: "airwallex",
  customer_email: "john.doe@example.com",
  raw_event: { /* full Airwallex payload */ },
  webhook_id: "evt_hkdm0q2eur8cjn5000000",
  metadata: {
    payment_method: "card",
    description: "Premium Subscription"
  }
}
```

### Key Differences Between Providers

| Field | Stripe | Airwallex |
|-------|--------|-----------|
| **Amount Format** | Integer (cents) | Decimal (dollars) |
| **Transaction ID** | `pi_`, `ch_`, `in_` prefix | `int_`, `att_` prefix |
| **Status Values** | `succeeded`, `requires_payment_method` | `SUCCEEDED`, `FAILED` |
| **Timestamp** | Unix timestamp | ISO 8601 string |
| **Customer Data** | Separate customer object | Embedded in payment |
| **Error Details** | `last_payment_error` object | `payment_error` in attempt |

Your application automatically handles these differences and stores everything in a consistent format in MongoDB.
