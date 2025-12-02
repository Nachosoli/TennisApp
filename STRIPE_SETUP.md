# Stripe Payment Integration Setup

This document explains how to set up Stripe payments for CourtBuddy.

## Environment Variables

### Backend (Railway/Production)

Add these environment variables to your backend service:

```env
# Stripe API Keys (from Stripe Dashboard)
# Replace with your actual keys from Stripe Dashboard
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Stripe Webhook Secret (get from Stripe Dashboard → Webhooks)
# This is used to verify webhook signatures
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here
```

### Frontend (Railway/Production)

Add this environment variable to your frontend service:

```env
# Stripe Publishable Key (from Stripe Dashboard)
# Replace with your actual publishable key from Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key_here
```

## Getting Your Stripe Keys

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com
2. **Get API Keys**:
   - Go to **Developers** → **API keys**
   - Copy your **Publishable key** (starts with `pk_live_`)
   - Copy your **Secret key** (starts with `sk_live_`)

3. **Set up Webhook**:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `https://your-backend-domain.com/api/v1/payments/webhook`
   - Select events to listen to:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.refunded`
   - Copy the **Signing secret** (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET`

## Database Migration

Run the migration to create the transactions table:

```bash
cd backend
npm run migration:run
```

Or use the admin panel at `/admin/migrations` to run the migration.

## Testing

### Test Mode

For testing, use Stripe test keys:
- Test Publishable Key: `pk_test_...`
- Test Secret Key: `sk_test_...`
- Test Webhook Secret: `whsec_test_...`

You can use Stripe's test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3D Secure: `4000 0025 0000 3155`

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/webhook
```

This will give you a webhook signing secret to use locally.

## Payment Flow

1. **Create Payment Intent**: Frontend calls `/api/v1/payments/create-payment-intent`
2. **Display Payment Form**: Frontend shows Stripe Elements payment form
3. **Confirm Payment**: User enters payment details and submits
4. **Webhook Processing**: Stripe sends webhook events to `/api/v1/payments/webhook`
5. **Transaction Update**: Backend updates transaction status based on webhook events

## API Endpoints

- `POST /api/v1/payments/create-payment-intent` - Create a payment intent
- `POST /api/v1/payments/confirm` - Confirm a payment (optional, webhooks handle this)
- `GET /api/v1/payments/transactions` - Get user's payment history
- `GET /api/v1/payments/transactions/:id` - Get a specific transaction
- `POST /api/v1/payments/transactions/:id/refund` - Create a refund
- `POST /api/v1/payments/webhook` - Stripe webhook endpoint (no auth required)

## Usage Example

```tsx
import { PaymentForm } from '@/components/payments/PaymentForm';

function CheckoutPage() {
  return (
    <PaymentForm
      amount={10.00}
      currency="usd"
      matchId="match-uuid"
      description="Match fee payment"
      onSuccess={(transactionId) => {
        console.log('Payment successful!', transactionId);
        // Redirect or show success message
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
        // Show error message
      }}
    />
  );
}
```

## Security Notes

- **Never expose your Secret Key** in frontend code
- **Always verify webhook signatures** in production
- **Use HTTPS** for all payment-related endpoints
- **Store webhook secrets securely** as environment variables
- **Log all payment events** for auditing

## Troubleshooting

### Webhook Not Receiving Events

1. Check that webhook endpoint URL is correct in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check backend logs for webhook errors
4. Use Stripe Dashboard → Webhooks → View logs to see delivery status

### Payment Intent Creation Fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check that amount is valid (minimum $0.50 for USD)
3. Verify user is authenticated (JWT token required)

### Frontend Payment Form Not Loading

1. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
2. Check browser console for errors
3. Ensure Stripe.js is loading correctly

