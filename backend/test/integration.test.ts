import request from 'supertest';
import express from 'express';
import paymentRoutes, { paymentsDb, ordersDb } from '../src/routes/paymentRoutes';
import webhookRoutes from '../src/routes/webhookRoutes';
import * as hashkeyService from '../src/services/hashkeyService';

// Mock the external service calls so we don't actually hit HashKey or Blockchain
jest.mock('../src/services/hashkeyService');
jest.mock('../src/services/productRegistryService', () => ({
  recordPurchaseOnchain: jest.fn().mockResolvedValue(true)
}));

const app = express();
app.use(express.json());
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);

describe('Integration Tests - Payments & Webhooks', () => {
  beforeEach(() => {
    // Clear databases before each test
    paymentsDb.length = 0;
    ordersDb.length = 0;
    jest.clearAllMocks();
  });

  describe('POST /api/payment/create', () => {
    it('should successfully create an order and store it in the mock DB', async () => {
      // Mock Hashkey API returning a checkout URL
      (hashkeyService.createHashKeyOrder as jest.Mock).mockResolvedValue({
        payment_url: 'https://checkout.hashkey.com/pay/12345',
        payment_request_id: 'REQ-12345'
      });

      const response = await request(app)
        .post('/api/payment/create')
        .send({
          productId: 1,
          amount: '10.00',
          merchantWallet: '0x123',
          productName: 'Test Product',
          buyerWallet: '0xABC'
        });

      expect(response.status).toBe(200);
      expect(response.body.checkoutUrl).toBe('https://checkout.hashkey.com/pay/12345');
      
      // Verify DB insertion
      expect(ordersDb.length).toBe(1);
      expect(paymentsDb.length).toBe(1);
      expect(paymentsDb[0].paymentRequestId).toBe('REQ-12345');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/payment/create')
        .send({ productId: 1 }); // Missing amount and merchantWallet

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('POST /api/webhook/hashkey', () => {
    it('should process a valid webhook, update DB, and call the blockchain', async () => {
      // 1. Seed the DB with a pending order
      const mockPaymentReqId = 'REQ-555';
      paymentsDb.push({
        orderId: 'ORD-ABC',
        paymentRequestId: mockPaymentReqId,
        productId: 2,
        buyerWallet: '0xBuyer',
        status: 'pending'
      });

      ordersDb.push({
        id: 'ORD-ABC',
        status: 'pending',
        paymentRequestId: mockPaymentReqId,
        productId: 2
      });

      // 2. Mock the signature verifier to return TRUE
      (hashkeyService.verifyHashkeyWebhook as jest.Mock).mockReturnValue(true);

      const webhookPayload = {
        status: 'payment-successful',
        payment_request_id: mockPaymentReqId
      };

      const response = await request(app)
        .post('/api/webhook/hashkey')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);

      // Verify order status updated
      const order = ordersDb.find((o: any) => o.id === 'ORD-ABC');
      expect(order?.status).toBe('paid');
    });

    it('should return 401 Unauthorized for invalid signatures', async () => {
      // Mock verifier to return FALSE
      (hashkeyService.verifyHashkeyWebhook as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .post('/api/webhook/hashkey')
        .send({ status: 'payment-successful' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized / Invalid Signature');
    });

    it('should ignore webhooks that are not payment-successful', async () => {
      (hashkeyService.verifyHashkeyWebhook as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .post('/api/webhook/hashkey')
        .send({ status: 'payment-failed', payment_request_id: 'REQ-FAILED' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });
  });
});