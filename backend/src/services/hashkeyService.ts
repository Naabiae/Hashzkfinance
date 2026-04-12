import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';
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

function generateMerchantAuthorization(cartHash: string): string {
  const payload = {
    iss: MERCHANT_NAME,
    sub: MERCHANT_NAME,
    aud: "HashkeyMerchant",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    jti: crypto.randomUUID(),
    cart_hash: cartHash
  };

  return jwt.sign(payload, pemPrivateKey, { algorithm: 'ES256K' as any });
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
  const apiPath = "/merchant/orders";
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
  const jwtToken = generateMerchantAuthorization(cartHash);

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