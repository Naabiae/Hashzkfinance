import * as dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly for the test script
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createHashKeyOrder } from './src/services/hashkeyService';

async function runSeed() {
  console.log("Generating 5 Test Transactions for HashKey Merchant Dashboard...");
  
  // Use the deployer wallet we just generated
  const merchantWallet = "0x361271C405C87192432Eab8Bb055e90dB28abD28";

  for (let i = 1; i <= 5; i++) {
    const orderId = `HASHBAZAAR-TEST-${Date.now()}-${i}`;
    const amount = (10 + (i * 2.5)).toFixed(2); // e.g. 12.50, 15.00...
    const productName = `HashBazaar Premium Item #${i}`;

    console.log(`\n[${i}/5] Creating Order: ${orderId} | Product: ${productName} | Amount: $${amount} USDC`);

    try {
      const response = await createHashKeyOrder({
        orderId,
        amount,
        merchantWallet,
        productName
      });
      
      console.log(`✅ Success! Checkout URL generated:`);
      console.log(`🔗 ${response.payment_url}`);
      
      // Sleep for 1.5 seconds to avoid any rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error: any) {
      console.error(`❌ Failed to create Order ${i}:`);
      console.error(error.message || error);
      if (error.response) {
         console.error(error.response.data);
      }
    }
  }

  console.log("\n🎉 Finished generating 5 transactions! Please check your HashKey Merchant Dashboard.");
}

runSeed();