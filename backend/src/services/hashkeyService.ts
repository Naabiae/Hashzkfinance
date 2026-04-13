import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as jose from 'jose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const APP_KEY = process.env.HASHKEY_APP_KEY || "DUMMY_APP_KEY";
const APP_SECRET = process.env.HASHKEY_APP_SECRET || "DUMMY_APP_SECRET";
const MERCHANT_NAME = process.env.MERCHANT_NAME || "HashBazaar";
const API_BASE_URL = process.env.HASHKEY_API_BASE || "https://merchant-qa.hashkeymerchant.com";

// Read the static private key from the file system (outside the backend folder for security)
let pemPrivateKey = "";
try {
  const privateKeyPath = path.join(__dirname, '../../../merchant_private_key.pem');
  pemPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (err) {
  console.warn("Warning: merchant_private_key.pem not found. JWT signing will fail.");
}

function generateCartHash(contents: any): string {
  // Note: For production, ensure this is a canonical JSON stringifier
  const serialized = JSON.stringify(contents);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

async function generateMerchantAuthorization(cartHash: string): Promise<string> {
  const payload = {
    iss: MERCHANT_NAME,
    sub: MERCHANT_NAME,
    aud: "HashkeyMerchant",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    jti: crypto.randomUUID(),
    cart_hash: cartHash
  };

  // Hashkey requires ES256K. Neither jsonwebtoken nor jose fully support ES256K seamlessly.
  // So we manually sign the JWT using crypto.
  
  const header = { alg: 'ES256K', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  
  const signatureDer = sign.sign(pemPrivateKey);
  
  // Convert DER to raw format (64 bytes for ES256K / P-256K)
  // We can use the ecdsa-sig-formatter library which jsonwebtoken uses internally.
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

function generateHmacHeaders(method: string, apiPath: string, query: string, bodyStr: string) {
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
  const apiPath = "/api/v1/merchant/orders"; // HashKey API endpoint paths are usually /api/v1/merchant/...
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
        id: `PAY-${Date.now()}`,
        total: {
          label: details.productName,
          amount: { currency: "USD", value: details.amount }
        }
      }
    },
    cart_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    merchant_name: MERCHANT_NAME
  };

  const cartHash = generateCartHash(contents);
  const jwtToken = await generateMerchantAuthorization(cartHash);

  const body = {
    cart_mandate: {
      contents: contents,
      merchant_authorization: jwtToken
    }
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