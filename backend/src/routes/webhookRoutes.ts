import { Router } from 'express';
import { paymentsDb, ordersDb } from './paymentRoutes';
import { recordPurchaseOnchain } from '../services/productRegistryService';
import { verifyHashkeyWebhook } from '../services/hashkeyService';
import express from 'express';
import { ethers } from 'ethers';

const router = Router();

// We need rawBody for signature verification, so we should capture it.
// Assuming express.json() is used globally, we might need a custom middleware 
// to capture raw body, but for hackathon scope, we can stringify req.body or assume it's exact.
// Better: use JSON.stringify(req.body) knowing it might differ slightly, or ideally capture raw.

// HashKey Webhook Endpoint
router.post('/hashkey', async (req, res) => {
  try {
    const event = req.body;
    const rawBody = JSON.stringify(req.body); // NOTE: In production, use express.raw({type: 'application/json'}) to get exact bytes.
    
    // Log incoming webhook for debugging
    console.log("Received HashKey Webhook:", event.status, event.payment_request_id);

    // Verify HMAC signature
    const isValid = verifyHashkeyWebhook(req.headers, rawBody);
    if (!isValid) {
      console.warn("Invalid HashKey Webhook Signature. Rejecting.");
      return res.status(401).json({ error: "Unauthorized / Invalid Signature" });
    }

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
    const orderIndex = ordersDb.findIndex((o: any) => o.id === payment.orderId);

    if (event.status === "payment-successful") {
      paymentsDb[paymentIndex].status = "successful";
      if (orderIndex !== -1) {
        ordersDb[orderIndex].status = "paid";
        console.log(`✅ Order ${payment.orderId} marked as PAID.`);

        const order = ordersDb[orderIndex];
        const buyer = order.buyerWallet || ethers.ZeroAddress;
        const paymentRef = ethers.keccak256(ethers.toUtf8Bytes(String(event.payment_request_id)));

        try {
          const onchain = await recordPurchaseOnchain({
            productId: order.productId,
            buyer,
            quantity: 1,
            paymentRef
          });
          if (!onchain.skipped) {
            console.log(`🧾 On-chain purchase recorded: ${onchain.txHash}`);
          }
        } catch (e) {
          console.error("On-chain recordPurchase failed:", e);
          // Crucial fix: return a 500 so HashKey retries the webhook!
          return res.status(500).json({ error: "Failed to sync with blockchain" });
        }
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
