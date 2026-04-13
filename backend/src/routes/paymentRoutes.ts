import { Router } from 'express';
import { createHashKeyOrder } from '../services/hashkeyService';

const router = Router();

// Mock database to store orders temporarily
export const ordersDb: any[] = [];
export const paymentsDb: any[] = [];

// Create a new payment session
router.post('/create', async (req, res) => {
  try {
    const { productId, amount, merchantWallet, productName, buyerWallet } = req.body;

    if (!productId || !amount || !merchantWallet) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = `ORD-${Date.now()}`;

    // 1. Save order to DB (mock)
    const order = {
      id: orderId,
      productId,
      amount,
      buyerWallet,
      status: "pending"
    };
    ordersDb.push(order);

    // 2. Request checkout URL from HashKey Service
    const paymentResult = await createHashKeyOrder({
      orderId: order.id,
      amount: amount.toString(),
      merchantWallet: merchantWallet,
      productName: productName || "HashBazaar Item"
    });

    // 3. Save payment mapping (mock)
    paymentsDb.push({
      orderId: order.id,
      paymentRequestId: paymentResult.payment_request_id, // Based on HashKey docs
      paymentUrl: paymentResult.payment_url,
      status: "pending"
    });

    // 4. Return checkout URL to frontend
    res.json({
      success: true,
      orderId: order.id,
      checkoutUrl: paymentResult.payment_url
    });

  } catch (error: any) {
    console.error("Payment Creation Error:", error);
    res.status(500).json({ error: "Failed to create payment checkout" });
  }
});

export default router;
