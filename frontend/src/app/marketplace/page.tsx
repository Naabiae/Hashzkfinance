"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { ArrowRight, ShoppingBag } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Premium Web3 Hoodie",
    price: "25.00",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80",
    merchant: "0x1234...abcd",
  },
  {
    id: 2,
    name: "Crypto Hardware Wallet",
    price: "120.00",
    image:
      "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1200&q=80",
    merchant: "0x5678...efgh",
  },
  {
    id: 3,
    name: "HashKey Genesis NFT",
    price: "5.50",
    image:
      "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?auto=format&fit=crop&w=1200&q=80",
    merchant: "0x9101...ijkl",
  },
];

export default function MarketplacePage() {
  const { address } = useWeb3();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleCheckout = async (product: (typeof MOCK_PRODUCTS)[number]) => {
    if (!address) {
      alert("Please connect your wallet first to purchase.");
      return;
    }

    setLoadingId(product.id);
    try {
      const res = await axios.post("http://localhost:3001/api/payment/create", {
        productId: product.id,
        amount: product.price,
        merchantWallet: product.merchant,
        productName: product.name,
        buyerWallet: address,
      });

      if (res.data?.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl as string;
      } else {
        alert("Checkout URL not returned. Please verify backend configuration.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to initiate checkout. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-surface-strong p-10 lg:p-14 border border-border">
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-foreground">
            Marketplace
          </h1>
          <p className="text-lg text-muted max-w-xl">
            Buy physical and digital goods using HashKey checkout. Your receipt
            is recorded on-chain through the relayer.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#products" className="btn-primary inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Start Shopping
            </a>
            <a href="/contracts" className="btn-outline inline-flex items-center gap-2">
              View Contracts <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="products">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Drops</h2>
          <a className="text-primary font-medium hover:underline flex items-center" href="/#">
            Explore <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_PRODUCTS.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="card overflow-hidden group p-0 flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden relative bg-surface">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold shadow-sm border border-border">
                  ${product.price} USDC
                </div>
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold mb-1 text-foreground">{product.name}</h3>
                <p className="text-sm text-muted mb-6">
                  Listed by <span className="font-mono">{product.merchant}</span>
                </p>

                <div className="mt-auto">
                  <button
                    onClick={() => handleCheckout(product)}
                    disabled={loadingId === product.id}
                    className="w-full btn-primary py-3"
                  >
                    {loadingId === product.id ? "Processing..." : "Buy with HashKey"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

