import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const PRODUCT_REGISTRY_ADDRESS = process.env.PRODUCT_REGISTRY_ADDRESS || '';
const RPC_URL = process.env.RPC_URL || '';
const PAYMENT_RELAYER_PRIVATE_KEY = process.env.PAYMENT_RELAYER_PRIVATE_KEY || '';

const productRegistryAbi = [
  'function recordPurchase(uint256 productId, address buyer, uint256 quantity, bytes32 paymentRef) external',
];

// A simple mutex to prevent concurrent nonce errors in Ethers.js
let nonceMutex: Promise<any> = Promise.resolve();

export async function recordPurchaseOnchain(params: {
  productId: string | number;
  buyer: string;
  quantity: string | number;
  paymentRef: string;
}) {
  if (!PRODUCT_REGISTRY_ADDRESS || !RPC_URL || !PAYMENT_RELAYER_PRIVATE_KEY) {
    return { skipped: true };
  }

  // Queue the transaction to prevent Nonce collisions
  nonceMutex = nonceMutex.then(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PAYMENT_RELAYER_PRIVATE_KEY, provider);
      const registry = new ethers.Contract(PRODUCT_REGISTRY_ADDRESS, productRegistryAbi, wallet);

      const tx = await registry.recordPurchase(
        params.productId,
        params.buyer,
        params.quantity,
        params.paymentRef
      );

      const receipt = await tx.wait();
      return { skipped: false, txHash: receipt?.hash || tx.hash };
    } catch (error) {
      console.error(`❌ On-chain transaction failed:`, error);
      throw error; // Rethrow so the webhook handler can catch it and return 500
    }
  }).catch(err => {
    // If one fails, we shouldn't block the next in the queue, but we must propagate
    throw err;
  });

  return nonceMutex;
}

