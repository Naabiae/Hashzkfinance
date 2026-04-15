import { Router } from "express";
import { ordersDb, paymentsDb } from "./paymentRoutes";

const router = Router();

router.get("/merchant/:merchantWallet", (req, res) => {
  const merchantWallet = String(req.params.merchantWallet || "").toLowerCase();
  if (!merchantWallet) return res.status(400).json({ error: "Missing merchantWallet" });

  const merchantOrders = ordersDb.filter(
    (o: any) => String(o.merchantWallet || "").toLowerCase() === merchantWallet
  );

  const merchantPayments = paymentsDb.filter(
    (p: any) => String(p.merchantWallet || "").toLowerCase() === merchantWallet
  );

  const counts = {
    totalOrders: merchantOrders.length,
    pendingOrders: merchantOrders.filter((o: any) => o.status === "pending").length,
    paidOrders: merchantOrders.filter((o: any) => o.status === "paid").length,
    failedOrders: merchantOrders.filter((o: any) => o.status === "failed").length,
    totalCheckouts: merchantPayments.length,
    successfulPayments: merchantPayments.filter((p: any) => p.status === "successful").length,
    pendingPayments: merchantPayments.filter((p: any) => p.status === "pending").length,
    failedPayments: merchantPayments.filter((p: any) => p.status === "failed").length,
  };

  const totalPaidAmount = merchantOrders
    .filter((o: any) => o.status === "paid")
    .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  const totalCheckoutAmount = merchantPayments.reduce(
    (sum: number, p: any) => sum + Number(p.amount || 0),
    0
  );

  res.json({
    merchantWallet,
    counts,
    totals: {
      totalPaidAmount,
      totalCheckoutAmount,
    },
    recentOrders: merchantOrders
      .slice(-10)
      .reverse()
      .map((o: any) => ({
        id: o.id,
        productId: o.productId,
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      })),
  });
});

export default router;

