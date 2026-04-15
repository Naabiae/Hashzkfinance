"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { api } from "@/lib/api";
import { CONTRACT_ADDRESSES, useWeb3 } from "@/contexts/Web3Context";

type ChainProduct = {
  id: number;
  merchant: string;
  priceUSDC: bigint;
  metadataURI: string;
  isActive: boolean;
  isUnlimitedStock: boolean;
  stock: bigint;
  sold: bigint;
};

type MerchantAnalytics = {
  counts: {
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    failedOrders: number;
    totalCheckouts: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
  };
  totals: {
    totalPaidAmount: number;
    totalCheckoutAmount: number;
  };
};

const PRODUCT_REGISTRY_ABI = [
  "function nextProductId() external view returns (uint256)",
  "function products(uint256) external view returns (uint256 id, address merchant, uint256 priceUSDC, string metadataURI, bool isActive, bool isUnlimitedStock, uint256 stock, uint256 sold)",
];

export function useMerchantInsights() {
  const { address, provider, signer, role } = useWeb3();
  const [products, setProducts] = useState<ChainProduct[]>([]);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!address || !provider || !signer) return;
    if (role !== 1) return;

    setLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ProductRegistry,
        PRODUCT_REGISTRY_ABI,
        provider
      );

      const count = Number(await contract.nextProductId());
      const out: ChainProduct[] = [];
      for (let i = 0; i < count; i++) {
        const p = await contract.products(i);
        if (String(p.merchant).toLowerCase() !== address.toLowerCase()) continue;
        out.push({
          id: Number(p.id),
          merchant: p.merchant,
          priceUSDC: BigInt(p.priceUSDC),
          metadataURI: String(p.metadataURI),
          isActive: Boolean(p.isActive),
          isUnlimitedStock: Boolean(p.isUnlimitedStock),
          stock: BigInt(p.stock),
          sold: BigInt(p.sold),
        });
      }

      setProducts(out.sort((a, b) => b.id - a.id));

      const res = await api.get(`/api/analytics/merchant/${address}`);
      setAnalytics(res.data as MerchantAnalytics);
    } catch (e) {
      console.error(e);
      setError("Failed to load analytics. Verify backend and contract addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, role]);

  const totals = useMemo(() => {
    const listings = products.length;
    const sold = products.reduce((s, p) => s + p.sold, BigInt(0));
    const revenue = products.reduce((s, p) => s + p.sold * p.priceUSDC, BigInt(0));
    const active = products.filter((p) => p.isActive).length;
    const top = products
      .map((p) => ({ id: p.id, rev: p.sold * p.priceUSDC, p }))
      .sort((a, b) => (a.rev > b.rev ? -1 : a.rev < b.rev ? 1 : 0))[0]?.p;
    return { listings, sold, revenue, active, top };
  }, [products]);

  return { address, products, analytics, totals, loading, error, refresh };
}
