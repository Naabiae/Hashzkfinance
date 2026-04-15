"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { ShoppingBag, ArrowRight } from "lucide-react";
import axios from "axios";
import { useState } from "react";
import { motion } from "framer-motion";

// Mock products until we fetch from ProductRegistry
const MOCK_PRODUCTS = [
  { id: 1, name: "Premium Web3 Hoodie", price: "25.00", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80", merchant: "0x1234...abcd" },
  { id: 2, name: "Crypto Hardware Wallet", price: "120.00", image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80", merchant: "0x5678...efgh" },
  { id: 3, name: "HashKey Genesis NFT", price: "5.50", image: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?auto=format&fit=crop&w=800&q=80", merchant: "0x9101...ijkl" },
];

export default function Storefront() {
  const { address } = useWeb3();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleCheckout = async (product: typeof MOCK_PRODUCTS[0]) => {
    if (!address) {
      alert("Please connect your wallet first to purchase!");
      return;
    }

    setLoadingId(product.id);
    try {
      // In production, this URL would point to the deployed Express backend
      const res = await axios.post("http://localhost:3001/api/payment/create", {
        productId: product.id,
        amount: product.price,
        merchantWallet: product.merchant,
        productName: product.name,
        buyerWallet: address
      });

      if (res.data.success && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
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
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-strong p-12 lg:p-20 border border-border">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 text-foreground">
            The Decentralized <span className="text-primary">Marketplace</span> for Web3
          </h1>
          <p className="text-xl text-muted mb-8 leading-relaxed">
            Shop exclusive physical and digital goods directly using HashKey's secure crypto payment gateway. No middlemen, full transparency.
          </p>
          <button className="btn-primary flex items-center space-x-2 text-lg px-8 py-4">
            <ShoppingBag className="w-5 h-5" />
            <span>Start Shopping</span>
          </button>
        </div>
      </section>

      {/* Product Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Featured Drops</h2>
          <a href="#" className="text-primary font-medium hover:underline flex items-center">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_PRODUCTS.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="card overflow-hidden group p-0 flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden relative bg-surface">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold shadow-sm border border-border">
                  ${product.price} USDC
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-2 text-foreground">{product.name}</h3>
                <p className="text-sm text-muted mb-6">Listed by: <span className="font-mono">{product.merchant}</span></p>
                
                <div className="mt-auto">
                  <button 
                    onClick={() => handleCheckout(product)}
                    disabled={loadingId === product.id}
                    className="w-full btn-primary flex justify-center items-center py-3"
                  >
                    {loadingId === product.id ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      "Buy with HashKey"
                    )}
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