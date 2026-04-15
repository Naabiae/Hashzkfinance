"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, RefreshCcw, ShoppingBag } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { api } from "@/lib/api";
import { formatUSDCFrom6, compactAddress } from "@/lib/format";
import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts";

function isAllowedImage(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "images.unsplash.com" ||
        u.hostname === "storage.googleapis.com" ||
        u.hostname === "ipfs.io")
    );
  } catch {
    return false;
  }
}

export default function MarketplacePage() {
  const { address, connectWallet } = useWeb3();
  const { products, loading, error, refresh } = useMarketplaceProducts();
  const [checkoutId, setCheckoutId] = useState<number | null>(null);

  const buy = async (p: (typeof products)[number]) => {
    if (!address) {
      await connectWallet();
      return;
    }

    setCheckoutId(p.id);
    try {
      const res = await api.post("/api/payments/create", {
        productId: p.id,
        amount: formatUSDCFrom6(p.priceUSDC),
        merchantWallet: p.merchant,
        productName: p.name,
        buyerWallet: address,
      });

      const url = res.data?.checkoutUrl as string | undefined;
      if (url) window.location.href = url;
    } catch (e) {
      console.error(e);
      alert("Checkout failed. Verify backend is running and HashKey credentials are set.");
    } finally {
      setCheckoutId(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-wide uppercase text-muted">
              Live on HashKey Testnet
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Marketplace
            </h1>
            <p className="mt-3 text-muted text-lg max-w-none">
              These listings are pulled directly from the on-chain ProductRegistry.
              Purchases route through HashKey checkout and are recorded on-chain by the relayer.
            </p>
          </div>
          <button onClick={refresh} className="btn-outline inline-flex items-center gap-2">
            <RefreshCcw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 text-sm text-muted">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {products.map((p) => {
          const revenue = p.sold * p.priceUSDC;
          const remaining =
            p.isUnlimitedStock ? null : p.stock - p.sold;
          return (
            <div key={p.id} className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden shadow-sm">
              <div className="relative aspect-[4/3] bg-surface-strong">
                {p.image && isAllowedImage(p.image) ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-[var(--radius-md)] bg-foreground text-background flex items-center justify-center font-semibold">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 rounded-full border border-border bg-background/85 backdrop-blur px-3 py-1 text-xs font-semibold">
                  ${formatUSDCFrom6(p.priceUSDC)} USDC
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold tracking-tight">{p.name}</div>
                    {p.description ? (
                      <div className="mt-1 text-sm text-muted line-clamp-2">{p.description}</div>
                    ) : null}
                  </div>
                  <div className="text-xs font-mono text-muted">#{p.id}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-3">
                    <div className="text-muted font-semibold uppercase tracking-wide">Sold</div>
                    <div className="mt-1 font-mono text-foreground">{p.sold.toString()}</div>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-3">
                    <div className="text-muted font-semibold uppercase tracking-wide">Revenue</div>
                    <div className="mt-1 font-mono text-foreground">${formatUSDCFrom6(revenue)}</div>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-3">
                    <div className="text-muted font-semibold uppercase tracking-wide">Stock</div>
                    <div className="mt-1 font-mono text-foreground">
                      {p.isUnlimitedStock ? "∞" : remaining && remaining >= BigInt(0) ? remaining.toString() : "0"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 text-xs text-muted">
                  <div className="font-mono">{compactAddress(p.merchant)}</div>
                  <div className="uppercase tracking-wide font-semibold">Merchant</div>
                </div>

                <button
                  onClick={() => buy(p)}
                  disabled={checkoutId === p.id}
                  className="mt-6 w-full btn-primary py-3 inline-flex items-center justify-center gap-2"
                >
                  {checkoutId === p.id ? "Launching checkout…" : "Buy with HashKey"}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && products.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-10 text-center">
          <div className="text-lg font-semibold">No active products found</div>
          <div className="mt-2 text-muted text-sm">
            List a product as a Merchant, then come back here.
          </div>
        </div>
      ) : null}
    </div>
  );
}

