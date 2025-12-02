import { apiClient } from './api';

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  matchId?: string;
  description?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface Transaction {
  id: string;
  userId: string;
  matchId: string | null;
  type: 'match_fee' | 'subscription' | 'refund' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export const paymentsApi = {
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const response = await apiClient.post<CreatePaymentIntentResponse>('/payments/create-payment-intent', data);
    return response.data;
  },

  async confirmPayment(paymentIntentId: string): Promise<Transaction> {
    const response = await apiClient.post<Transaction>('/payments/confirm', { paymentIntentId });
    return response.data;
  },

  async getTransactions(): Promise<Transaction[]> {
    const response = await apiClient.get<Transaction[]>('/payments/transactions');
    return response.data;
  },

  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/payments/transactions/${transactionId}`);
    return response.data;
  },

  async createRefund(transactionId: string, amount?: number): Promise<Transaction> {
    const response = await apiClient.post<Transaction>(`/payments/transactions/${transactionId}/refund`, {
      amount,
    });
    return response.data;
  },
};

