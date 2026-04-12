I’ve extracted the text from your PDF and cleaned it up into readable format below.

---

# **HashKey Merchant Documentation (All-in-One)**

## **Overview**

HashKey Merchant is a crypto payment gateway that enables merchants to accept on-chain payments using stablecoins like **USDC** and **USDT**.

It provides:

* REST APIs to create payment orders
* Payment status querying
* Real-time webhook notifications

### **Key Features**

* One-time payments (e-commerce)
* Reusable payments (subscriptions, rentals)
* Webhook notifications (HMAC-SHA256 signed, retries up to 6 times)
* Multi-chain support (Ethereum, HashKey Chain)
* HMAC authentication
* ES256K JWT signing

---

## **One-Time vs Reusable Orders**

| Feature    | One-Time             | Reusable                       |
| ---------- | -------------------- | ------------------------------ |
| Use case   | E-commerce           | Subscriptions, rentals         |
| Payments   | One per order        | Multiple per mandate           |
| Create API | `/merchant/orders`   | `/merchant/orders/reusable`    |
| Query API  | `/merchant/payments` | `/merchant/payments/reusable`  |
| Expiry     | ~2 hours             | Long lifecycle (e.g. 365 days) |

---

## **System Flow**

1. Merchant creates order → gets `payment_url`
2. User opens checkout
3. User signs transaction (wallet)
4. Payment submitted
5. Blockchain transaction executed
6. Webhook notifies result

---

## **Core IDs**

* `cart_mandate_id` → Order ID
* `payment_request_id` → Payment request
* `flow_id` → Checkout flow ID
* `payment_mandate_id` → Same as payment_request_id
* `request_id` → Client-generated ID

---

## **Cart Mandate vs Payment Mandate**

* **Cart Mandate** → Merchant-created payment request
* **Payment Mandate** → User authorization (wallet signature)

---

## **Merchant Onboarding**

### Steps:

1. Generate key pair (secp256k1)
2. Submit registration
3. Verify email
4. Create app → get `app_key` & `app_secret`

### Key Generation:

```bash
openssl ecparam -name secp256k1 -genkey -noout -out merchant_private_key.pem
openssl ec -in merchant_private_key.pem -pubout -out merchant_public_key.pem
```

---

## **Authentication**

### 1. HMAC-SHA256 (Required)

Headers:

* `X-App-Key`
* `X-Signature`
* `X-Timestamp`
* `X-Nonce`

### Signing Steps:

```
message = METHOD + "\n" +
          PATH + "\n" +
          QUERY + "\n" +
          bodyHash + "\n" +
          timestamp + "\n" +
          nonce
```

```
signature = HMAC_SHA256(app_secret, message)
```

---

### 2. ES256K JWT

Used in `merchant_authorization`

Claims:

* `iss`, `sub` → merchant name
* `aud` → "HashkeyMerchant"
* `iat`, `exp`
* `jti` → unique ID
* `cart_hash`

---

## **API Base URLs**

* QA: `https://merchant-qa.hashkeymerchant.com`
* Staging: `https://merchant-stg.hashkeymerchant.com`
* Production: `https://merchant.hashkey.com`

---

## **Main APIs**

### Create One-Time Order

`POST /merchant/orders`

Returns:

```json
{
  "payment_url": "https://pay.hashkey.com/flow/xxx"
}
```

---

### Create Reusable Order

`POST /merchant/orders/reusable`

---

### Query Payments

* One-time: `GET /merchant/payments`
* Reusable: `GET /merchant/payments/reusable`

---

## **Payment Status States**

* `payment-required`
* `payment-submitted`
* `payment-verified`
* `payment-processing`
* `payment-included`
* `payment-successful` ✅
* `payment-failed` ❌

---

## **Cart Mandate Structure**

```json
{
  "cart_mandate": {
    "contents": {
      "id": "ORDER-001",
      "payment_request": {...},
      "cart_expiry": "...",
      "merchant_name": "My Store"
    },
    "merchant_authorization": "JWT"
  }
}
```

---

## **Canonical JSON + Hash**

Steps:

1. Sort JSON keys
2. Serialize
3. SHA-256 hash → `cart_hash`

---

## **Webhooks**

Triggered on:

* payment-successful
* payment-included
* payment-failed

### Header:

```
X-Signature: t=<timestamp>,v1=<signature>
```

### Verification:

```
signature = HMAC_SHA256(app_secret, timestamp + "." + body)
```

---

### Retry Policy

* 1 min
* 5 min
* 15 min
* 1 hour
* 6 hours
* 24 hours

---

## **Error Codes**

### General

* `10001` → Invalid params
* `10002` → Unauthorized
* `10004` → Conflict

### Cart Mandate

* `40001` → Expired/used
* `40002` → Wrong endpoint

---

## **Summary**

HashKey Merchant is essentially:

* A **crypto Stripe-like API**
* Uses **HMAC + JWT security**
* Supports **multi-chain stablecoin payments**
* Relies heavily on:

  * Cart Mandates (merchant intent)
  * Payment Mandates (user approval)
  * Webhooks (final confirmation)

---

If you want, I can:

* Turn this into a **developer-friendly quickstart**
* Or map it directly into your **backend architecture (Node/Express/Next.js)**
* Or even build a **working integration template**

