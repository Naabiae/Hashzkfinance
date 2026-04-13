import * as dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly for the test script
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createHashKeyOrder } from './src/services/hashkeyService';

async function runTest() {
  console.log("Testing HashKey API with REAL credentials...");
  try {
    const response = await createHashKeyOrder({
      orderId: `ORD-${Date.now()}`,
      amount: "10.00",
      merchantWallet: "0x1234567890123456789012345678901234567890",
      productName: "Test Hackathon Product"
    });
    console.log("\n✅ SUCCESS! Received payload:");
    console.log(response);
  } catch (error: any) {
    console.error("\n❌ TEST FAILED:");
    console.error(error.message || error);
    if (error.response) {
       console.error(error.response.data);
    }
  }
}

runTest();