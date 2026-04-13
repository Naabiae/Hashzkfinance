import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as jose from 'jose';
import axios from 'axios';
import dotenv from 'dotenv';
// A fallback manual canonicalizer in case the package has ESM/CommonJS issues
function manualCanonicalize(obj: any): string | undefined {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const arrStr = obj.map(item => manualCanonicalize(item) || 'null').join(',');
    return `[${arrStr}]`;
  }
  const keys = Object.keys(obj).sort();
  const keyValuePairs = keys.map(key => {
    const val = manualCanonicalize(obj[key]);
    if (val !== undefined) {
      return `${JSON.stringify(key)}:${val}`;
    }
  }).filter(v => v !== undefined);
  return `{${keyValuePairs.join(',')}}`;
}

dotenv.config();

const APP_KEY = process.env.HASHKEY_APP_KEY || "DUMMY_APP_KEY";
const APP_SECRET = process.env.HASHKEY_APP_SECRET || "DUMMY_APP_SECRET";
const MERCHANT_NAME = process.env.MERCHANT_NAME || "HashBazaar";
const MERCHANT_ID = process.env.MERCHANT_ID || "09562108";
const API_BASE_URL = process.env.HASHKEY_API_BASE || "https://dev-gateway.hashkey.com";

// Read the static private key from the file system (outside the backend folder for security)
let pemPrivateKey = "";
try {
  const privateKeyPath = path.join(__dirname, '../../../merchant_private_key.pem');
  pemPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (err) {
  console.warn("Warning: merchant_private_key.pem not found. JWT signing will fail.");
}

async function generateMerchantAuthorization(contents: any): Promise<string> {
  const payload = {
    iss: "merchant", // Based on the official example provided
    aud: "HashkeyMerchant",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    contents: contents // Embed contents directly in payload, not as cart_hash
  };

  const header = { alg: 'ES256K', typ: 'JWT' };
  
  // Use manualCanonicalize (RFC8785) for exact byte-for-byte matches
  const canonicalHeader = manualCanonicalize(header) || "";
  const canonicalPayload = manualCanonicalize(payload) || "";
  
  const encodedHeader = Buffer.from(canonicalHeader).toString('base64url');
  const encodedPayload = Buffer.from(canonicalPayload).toString('base64url');
  
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  // Sign using crypto directly for secp256k1 (ES256K)
  const sign = crypto.createSign('RSA-SHA256'); // For EC secp256k1, node crypto uses 'RSA-SHA256' or 'SHA256' as the hash digest
  sign.update(signingInput);
  sign.end();
  
  const signatureDer = sign.sign(pemPrivateKey);
  
  // Convert DER to raw format (64 bytes for ES256K / P-256K)
  const jwt = `${signingInput}.${derToRaw(signatureDer).toString('base64url')}`;
  
  return jwt;
}

// A simple utility to convert DER ECDSA signature to 64-byte raw signature (R | S)
function derToRaw(der: Buffer): Buffer {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error('Expected sequence tag');
  const seqLength = der[offset++];
  if (der[offset++] !== 0x02) throw new Error('Expected integer tag');
  let rLength = der[offset++];
  let r = der.subarray(offset, offset + rLength);
  offset += rLength;
  if (der[offset++] !== 0x02) throw new Error('Expected integer tag');
  let sLength = der[offset++];
  let s = der.subarray(offset, offset + sLength);

  if (r.length > 32 && r[0] === 0x00) r = r.subarray(1);
  if (s.length > 32 && s[0] === 0x00) s = s.subarray(1);
  
  const raw = Buffer.alloc(64);
  r.copy(raw, 32 - r.length);
  s.copy(raw, 64 - s.length);
  return raw;
}

export function verifyHashkeyWebhook(headers: any, rawBody: string): boolean {
  const method = "POST";
  const apiPath = "/api/webhook/hashkey"; // Should match exactly what HashKey thinks it's hitting
  const query = ""; // Usually empty for POST webhooks unless there are query params
  const bodyHash = rawBody ? crypto.createHash('sha256').update(rawBody).digest('hex') : "";
  const timestamp = headers['x-timestamp'];
  const nonce = headers['x-nonce'];
  const providedSignature = headers['x-signature'];

  if (!timestamp || !nonce || !providedSignature) return false;

  // The timestamp validity check (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Math.abs(now - ts) > 300) return false; // 5 mins expired

  const message = [
    method,
    apiPath,
    query,
    bodyHash,
    timestamp,
    nonce
  ].join('\n');

  const calculatedSignature = crypto.createHmac('sha256', APP_SECRET)
                                    .update(message)
                                    .digest('hex');

  return calculatedSignature === providedSignature;
}
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = bodyStr ? crypto.createHash('sha256').update(bodyStr).digest('hex') : "";

  const message = [
    method.toUpperCase(),
    apiPath,
    query,
    bodyHash,
    timestamp,
    nonce
  ].join('\n');

  const signature = crypto.createHmac('sha256', APP_SECRET)
                          .update(message)
                          .digest('hex');

  return {
    'X-App-Key': APP_KEY,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'Content-Type': 'application/json'
  };
}

export interface OrderDetails {
  orderId: string;
  amount: string;
  merchantWallet: string;
  productName: string;
}

export async function createHashKeyOrder(details: OrderDetails) {
  // Correct endpoint as per the docs:
  // POST: /api/v1/public/payments/cart-mandate
  const apiPath = "/api/v1/public/payments/cart-mandate";
  const endpoint = `${API_BASE_URL}${apiPath}`;

  const contents = {
    id: details.orderId,
    user_cart_confirmation_required: true,
    payment_request: {
      method_data: [{
        supported_methods: "https://www.x402.org/",
        data: {
          x402Version: 2,
          network: "sepolia",
          chain_id: 11155111,
          contract_address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Dummy Sepolia USDC
          pay_to: details.merchantWallet,
          coin: "USDC"
        }
      }],
      details: {
        id: `PAY-REQ-${Date.now()}`,
        display_items: [
          {
            label: details.productName,
            amount: { currency: "USD", value: details.amount }
          }
        ],
        total: {
          label: "Total",
          amount: { currency: "USD", value: details.amount }
        }
      }
    },
    cart_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    merchant_name: MERCHANT_NAME
  };

  const jwtToken = await generateMerchantAuthorization(contents);

  // According to docs, the payload has a root object with `cart_mandate` and `redirect_url`
  const body = {
    cart_mandate: {
      contents: contents,
      merchant_authorization: jwtToken
    },
    redirect_url: "https://hashbazaar.com/payment/callback" // This would be your frontend callback URL
  };

  const bodyStr = JSON.stringify(body);
  const headers = generateHmacHeaders('POST', apiPath, "", bodyStr);

  try {
    const response = await axios.post(endpoint, bodyStr, { headers });
    return response.data;
  } catch (error: any) {
    console.error("HashKey API Error:", error.response?.data || error.message);
    throw new Error("Failed to create HashKey order");
  }
}