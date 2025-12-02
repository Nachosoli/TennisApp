'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentsApi, CreatePaymentIntentRequest } from '@/lib/payments';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface PaymentFormProps {
  amount: number;
  currency?: string;
  matchId?: string;
  description?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

function CheckoutForm({
  amount,
  currency = 'usd',
  matchId,
  description,
  onSuccess,
  onError,
  onCancel,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Payment submission failed');
        setIsProcessing(false);
        return;
      }

      // Get the payment intent from the element
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        onError?.(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        try {
          const transaction = await paymentsApi.confirmPayment(paymentIntent.id);
          onSuccess?.(transaction.id);
        } catch (confirmError: any) {
          console.error('Failed to confirm payment on backend:', confirmError);
          // Payment succeeded in Stripe but backend confirmation failed
          // This should be handled by webhook, but we'll still show success
          onSuccess?.(paymentIntent.id);
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>
        
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const request: CreatePaymentIntentRequest = {
          amount: props.amount,
          currency: props.currency,
          matchId: props.matchId,
          description: props.description || `Payment of $${props.amount.toFixed(2)}`,
        };

        const response = await paymentsApi.createPaymentIntent(request);
        setClientSecret(response.clientSecret);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to initialize payment';
        setError(errorMsg);
        props.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [props.amount, props.currency, props.matchId, props.description, props.onError]);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Card className="p-6">
        <div className="text-red-600">
          Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing payment...</p>
        </div>
      </Card>
    );
  }

  if (error || !clientSecret) {
    return (
      <Card className="p-6">
        <div className="text-red-600">
          {error || 'Failed to initialize payment. Please try again.'}
        </div>
      </Card>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
}

