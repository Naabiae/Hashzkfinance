import { Router } from 'express';
import { paymentsDb, ordersDb } from './paymentRoutes';

const router = Router();

// HashKey Webhook Endpoint
router.post('/hashkey', async (req, res) => {
  try {
    const event = req.body;
    
    // Log incoming webhook for debugging
    console.log("Received HashKey Webhook:", event.status, event.payment_request_id);

    // In production, MUST verify HMAC signature from headers here
    // const signature = req.headers['x-signature'];
    // verifyHmac(signature, req.body, APP_SECRET);

    if (!event.payment_request_id) {
      return res.status(400).json({ error: "Missing payment_request_id" });
    }

    // Find the payment in our database
    const paymentIndex = paymentsDb.findIndex(p => p.paymentRequestId === event.payment_request_id);
    
    if (paymentIndex === -1) {
      console.warn("Payment not found in DB:", event.payment_request_id);
      return res.status(200).json({ code: 0, message: "Ignored" }); // Always return 200 to acknowledge receipt
    }

    const payment = paymentsDb[paymentIndex];
    const orderIndex = ordersDb.findIndex(o => o.id === payment.orderId);

    if (event.status === "payment-successful") {
      paymentsDb[paymentIndex].status = "successful";
      if (orderIndex !== -1) {
        ordersDb[orderIndex].status = "paid";
        console.log(`✅ Order ${payment.orderId} marked as PAID.`);
        // Here you would trigger digital delivery or notify the merchant
      }
    } 
    else if (event.status === "payment-failed") {
      paymentsDb[paymentIndex].status = "failed";
      if (orderIndex !== -1) {
        ordersDb[orderIndex].status = "failed";
        console.log(`❌ Order ${payment.orderId} marked as FAILED.`);
      }
    }

    // HashKey requires a 200 response with { code: 0 } to stop retries
    res.status(200).json({ code: 0 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;