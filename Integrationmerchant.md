Alright — this is where things get interesting. You’re not just “integrating a payment API”, you’re basically turning **HashKey Merchant into the payment backbone of HashBazaar**.

Let’s wire this properly so it actually works in your architecture 👇

---

# 🧠 Big Picture: Where HashKey Fits in HashBazaar

Your system becomes:

```
Frontend (Marketplace UI)
        ↓
Backend (Your API)
        ↓
HashKey Merchant API  ← (payments)
        ↓
Blockchain (USDC / USDT)
```

And separately:

```
KYC (HashKey KYC infra)
        ↓
Merchant NFT / Registry (your contract)
```

---

# 🔌 Core Integration Points (From the Docs → Your Product)

## 1. 🧾 Merchant Payment Flow (MOST IMPORTANT)

This is your main revenue flow.

### What happens in your app:

1. Buyer clicks **“Buy Product”**
2. Your backend calls:

```
POST /api/v1/merchant/orders
```

From docs: 
→ This creates a **Cart Mandate**

---

### 🧩 How you map it to HashBazaar:

| HashKey Concept      | Your Product    |
| -------------------- | --------------- |
| `cart_mandate_id`    | `orderId`       |
| `payment_request_id` | `paymentId`     |
| `payment_url`        | Checkout link   |
| `pay_to`             | Merchant wallet |
| `amount`             | Product price   |

---

### 🔥 Backend Example (Node)

```ts
async function createPaymentOrder(product, buyer) {
  const body = {
    cart_mandate: {
      contents: {
        id: `ORDER-${Date.now()}`,
        user_cart_confirmation_required: true,
        payment_request: {
          method_data: [{
            supported_methods: "https://www.x402.org/",
            data: {
              x402Version: 2,
              network: "sepolia",
              chain_id: 11155111,
              contract_address: USDC_ADDRESS,
              pay_to: product.merchantWallet,
              coin: "USDC"
            }
          }],
          details: {
            id: `PAY-${Date.now()}`,
            total: {
              label: product.name,
              amount: { currency: "USD", value: product.price }
            }
          }
        },
        cart_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        merchant_name: product.merchantName
      },
      merchant_authorization: signJWT(...)
    }
  }

  // Sign with HMAC (docs requirement)
  const headers = signHashKeyRequest(body)

  return fetch(HASHKEY_URL + "/merchant/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  })
}
```

---

## 2. 🔐 HMAC + JWT (CRITICAL OR NOTHING WORKS)

From docs:

* HMAC → protects API calls
* JWT (ES256K) → proves merchant authenticity 

### You need:

### ✅ HMAC

```ts
signature = HMAC_SHA256(app_secret, message)
```

### ✅ JWT (merchant_authorization)

```ts
jwt.sign(payload, privateKey, { algorithm: "ES256K" })
```

---

💡 **Hackathon shortcut:**
You can hardcode 1 merchant key instead of multi-merchant signing initially.

---

## 3. 🔔 Webhooks (THIS DRIVES YOUR APP STATE)

From docs:
HashKey sends webhook when:

* `payment-successful`
* `payment-failed` 

---

### In HashBazaar:

Webhook = **order completion trigger**

---

### Example:

```ts
app.post("/webhook/hashkey", (req, res) => {
  const event = req.body

  if (event.status === "payment-successful") {
    // ✅ Mark order as paid
    // ✅ Notify merchant
    // ✅ Trigger delivery
  }

  if (event.status === "payment-failed") {
    // ❌ Mark failed
  }

  res.status(200).send({ code: 0 })
})
```

---

## 4. 🔄 Payment Status (Fallback / UI Updates)

Use:

```
GET /merchant/payments?payment_request_id=xxx
```

Use this for:

* Order tracking UI
* Backup if webhook fails

---

## 5. 🔁 Reusable Orders → YOUR SECRET WEAPON

From docs:

```
POST /merchant/orders/reusable
```

---

### This unlocks:

| Feature        | Use Case          |
| -------------- | ----------------- |
| Subscriptions  | SaaS merchants    |
| Installments   | Buy now pay later |
| Device rentals | Pay-per-use       |

---

### 💡 For your product:

You can pitch:

> “We support **PayFi installment commerce using reusable mandates**”

That’s **very strong for judges**.

---

# 💰 P2P On/Off Ramp (Where HashKey Stops)

HashKey **does NOT handle fiat**
→ That’s YOUR layer

---

## Your Offramp Flow:

```
Merchant → creates sell order (USDC)
        ↓
P2P Agent accepts
        ↓
Crypto locked in escrow (your contract)
        ↓
Agent sends fiat (bank transfer)
        ↓
Merchant confirms
        ↓
USDC released
```

---

💡 Important:

* HashKey = **payment rail**
* You = **liquidity + fiat bridge**

---

# 🧱 Smart Contract Layer (Minimal)

You only need:

### 1. Merchant Registry

* Stores KYC-approved merchants
* Optional NFT badge

### 2. Escrow Contract (P2P)

* Lock funds
* Release on confirmation

---

# 🚀 Clean Architecture

## Backend (VERY IMPORTANT)

Split services:

```
/services
  ├── hashkeyService.ts   ← payments
  ├── kycService.ts       ← verification
  ├── escrowService.ts    ← P2P
```

---

## DB Models

```
Users
Merchants
Products
Orders
Payments
P2POrders
```

---

# 🏁 MVP Flow (What You Demo)

1. Merchant KYC (mock or real)
2. Merchant lists product
3. Buyer clicks buy
4. Redirect → HashKey checkout
5. Pay with USDC
6. Webhook fires
7. Order marked complete
8. (Optional) Merchant cashes out via P2P

---

# ⚠️ Common Mistakes (Avoid These)

* ❌ Forgetting HMAC → request fails silently
* ❌ Wrong JWT algo (must be ES256K)
* ❌ Reusing `cart_mandate_id` → error 40001
* ❌ Not handling webhook retries (idempotency)

---

# 💡 Final Positioning (Pitch This)

You’re not building “a marketplace”.

You’re building:

> **“A compliant PayFi commerce layer powered by HashKey’s on-chain payment infrastructure, with integrated P2P fiat liquidity.”**

That hits:

* PayFi ✅
* Compliance ✅
* Real-world usage ✅
* Infra utilization ✅

---

If you want next step, I can:

* Build your **exact backend folder structure**
* Write **HMAC + JWT utility functions**
* Or design **smart contracts for escrow + merchant NFT**

Just tell me 👍
