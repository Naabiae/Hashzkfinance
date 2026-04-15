"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, useWeb3 } from "@/contexts/Web3Context";
import { getReadProvider } from "@/lib/rpc";

type Product = {
  id: number;
  merchant: string;
  priceUSDC: bigint;
  metadataURI: string;
  isActive: boolean;
  isUnlimitedStock: boolean;
  stock: bigint;
  sold: bigint;
};

const PRODUCT_REGISTRY_ABI = [
  "function nextProductId() external view returns (uint256)",
  "function products(uint256) external view returns (uint256 id, address merchant, uint256 priceUSDC, string metadataURI, bool isActive, bool isUnlimitedStock, uint256 stock, uint256 sold)",
];

export function useMarketplaceProducts() {
  const { provider: walletProvider } = useWeb3();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = walletProvider ?? getReadProvider();
      const addr = CONTRACT_ADDRESSES.ProductRegistry;
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        throw new Error("ProductRegistry address not configured.");
      }
      const contract = new ethers.Contract(addr, PRODUCT_REGISTRY_ABI, provider);
      const count = Number(await contract.nextProductId());
      const out: Product[] = [];
      for (let i = 0; i < count; i++) {
        const p = await contract.products(i);
        out.push({
          id: Number(p.id),
          merchant: String(p.merchant),
          priceUSDC: BigInt(p.priceUSDC),
          metadataURI: String(p.metadataURI),
          isActive: Boolean(p.isActive),
          isUnlimitedStock: Boolean(p.isUnlimitedStock),
          stock: BigInt(p.stock),
          sold: BigInt(p.sold),
        });
      }
      setProducts(out.filter((p) => p.isActive).sort((a, b) => b.id - a.id));
    } catch (e) {
      console.error(e);
      setError("Failed to load on-chain products. Check RPC + contract addresses.");
    } finally {
      setLoading(false);
    }
  }, [walletProvider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const parsed = useMemo(() => {
    return products.map((p) => {
      let meta: { name?: string; description?: string; image?: string } = {};
      try {
        meta = JSON.parse(p.metadataURI || "{}");
      } catch {}
      return {
        ...p,
        name: meta.name ?? `Product #${p.id}`,
        description: meta.description ?? "",
        image: meta.image ?? "",
      };
    });
  }, [products]);

  return { products: parsed, loading, error, refresh };
}

