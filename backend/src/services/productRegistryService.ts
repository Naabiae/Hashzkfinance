import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const PRODUCT_REGISTRY_ADDRESS = process.env.PRODUCT_REGISTRY_ADDRESS || '';
const RPC_URL = process.env.RPC_URL || '';
const PAYMENT_RELAYER_PRIVATE_KEY = process.env.PAYMENT_RELAYER_PRIVATE_KEY || '';

const productRegistryAbi = [
  'function recordPurchase(uint256 productId, address buyer, uint256 quantity, bytes32 paymentRef) external',
];

export async function recordPurchaseOnchain(params: {
  productId: string | number;
  buyer: string;
  quantity: string | number;
  paymentRef: string;
}) {
  if (!PRODUCT_REGISTRY_ADDRESS || !RPC_URL || !PAYMENT_RELAYER_PRIVATE_KEY) {
    return { skipped: true };
  }

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
}

