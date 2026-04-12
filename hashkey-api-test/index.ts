import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// -----------------------------------------------------------------------------
// Dummy Credentials (In a real app, these come from your HashKey dashboard)
// -----------------------------------------------------------------------------
const APP_KEY = "DUMMY_APP_KEY";
const APP_SECRET = "DUMMY_APP_SECRET";
const MERCHANT_NAME = "HashBazaar";

// For ES256K, we need a secp256k1 key pair.
// We now read the static private key from the file system.
const privateKeyPath = path.join(__dirname, '../merchant_private_key.pem');
const pemPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');

// -----------------------------------------------------------------------------
// 1. Hash the Cart Contents (SHA-256)
// -----------------------------------------------------------------------------
function generateCartHash(contents: any) {
  // 1. Stringify the contents
  // HashKey usually requires canonical JSON (sorted keys), but for this test
  // standard JSON.stringify might suffice. If it fails in production, use a canonical stringify library.
  const serialized = JSON.stringify(contents);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

// -----------------------------------------------------------------------------
// 2. Generate the ES256K JWT
// -----------------------------------------------------------------------------
function generateMerchantAuthorization(cartHash: string) {
  const payload = {
    iss: MERCHANT_NAME,
    sub: MERCHANT_NAME,
    aud: "HashkeyMerchant",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    jti: crypto.randomUUID(),
    cart_hash: cartHash
  };

  // Sign with ES256K (typescript typing in jsonwebtoken may complain, so cast it)
  const token = jwt.sign(payload, pemPrivateKey, { algorithm: 'ES256K' as any });
  return token;
}

// -----------------------------------------------------------------------------
// 3. Generate HMAC-SHA256 API Signature
// -----------------------------------------------------------------------------
function generateHmacHeaders(method: string, path: string, query: string, bodyStr: string) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create SHA-256 hash of the body
  const bodyHash = bodyStr ? crypto.createHash('sha256').update(bodyStr).digest('hex') : "";

  // The strict HashKey message format
  const message = [
    method.toUpperCase(),
    path,
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

// -----------------------------------------------------------------------------
// 4. Test the API Call
// -----------------------------------------------------------------------------
async function testApiCall() {
  const endpoint = "https://merchant-qa.hashkeymerchant.com/merchant/orders";
  const path = "/merchant/orders";
  
  // Create our test cart mandate
  const contents = {
    id: `ORDER-${Date.now()}`,
    user_cart_confirmation_required: true,
    payment_request: {
      method_data: [{
        supported_methods: "https://www.x402.org/",
        data: {
          x402Version: 2,
          network: "sepolia",
          chain_id: 11155111,
          contract_address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Dummy Sepolia USDC
          pay_to: "0x1234567890123456789012345678901234567890", // Merchant receiving wallet
          coin: "USDC"
        }
      }],
      details: {
        id: `PAY-${Date.now()}`,
        total: {
          label: "Test Product",
          amount: { currency: "USD", value: "10.00" }
        }
      }
    },
    cart_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    merchant_name: MERCHANT_NAME
  };

  // Generate JWT
  const cartHash = generateCartHash(contents);
  const jwtToken = generateMerchantAuthorization(cartHash);

  // Final Request Body
  const body = {
    cart_mandate: {
      contents: contents,
      merchant_authorization: jwtToken
    }
  };

  const bodyStr = JSON.stringify(body);

  // Generate HMAC Headers
  const headers = generateHmacHeaders('POST', path, "", bodyStr);

  console.log("=== Payload ===");
  console.log(JSON.stringify(body, null, 2));
  console.log("\n=== Headers ===");
  console.log(headers);

  try {
    console.log("\n=== Making Request ===");
    const response = await axios.post(endpoint, bodyStr, { headers });
    console.log("\n=== Request Successful ===");
    console.log("Response:", response.data);
  } catch (error: any) {
    console.error("\n=== Request Failed ===");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data || error.message);
    
    // We EXPECT a 401 Unauthorized or 10002 because our keys are dummy.
    // The goal is to see if we successfully formatted everything to reach their gateway!
  }
}

testApiCall();