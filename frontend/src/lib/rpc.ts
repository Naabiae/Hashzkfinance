import { ethers } from "ethers";

export function getReadProvider() {
  const url = process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet.hsk.xyz";
  return new ethers.JsonRpcProvider(url);
}

