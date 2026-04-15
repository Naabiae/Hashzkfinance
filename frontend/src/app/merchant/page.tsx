"use client";

import { useState } from "react";
import { useWeb3, CONTRACT_ADDRESSES } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { PlusCircle, DollarSign, PackageOpen } from "lucide-react";

// Minimal ABI for ProductRegistry
const PRODUCT_REGISTRY_ABI = [
  "function listProductWithStock(uint256 priceUSDC, string calldata metadataURI, uint256 stock) external returns (uint256)"
];

// Minimal ABI for P2PEscrow and Mock USDC
const ESCROW_ABI = [
  "function createOrder(uint256 amount) external returns (uint256)"
];
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

export default function MerchantDashboard() {
  const { signer, role } = useWeb3();
  const [activeTab, setActiveTab] = useState<"inventory" | "escrow">("inventory");

  const [form, setForm] = useState({ name: "", price: "", stock: "", image: "" });
  const [escrowAmount, setEscrowAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (role !== 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-muted">You need a Merchant Identity NFT to view this dashboard.</p>
      </div>
    );
  }

  const handleListProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;
    setLoading(true);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.ProductRegistry, PRODUCT_REGISTRY_ABI, signer);
      // Construct a mock metadata URI using the form data
      const metadata = JSON.stringify({ name: form.name, image: form.image });
      const price = ethers.parseUnits(form.price, 6); // Assuming 6 decimals for USDC
      const stock = parseInt(form.stock, 10);

      const tx = await contract.listProductWithStock(price, metadata, stock);
      await tx.wait();
      
      alert("Product listed successfully!");
      setForm({ name: "", price: "", stock: "", image: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to list product.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;
    setLoading(true);

    try {
      if (!CONTRACT_ADDRESSES.USDC) {
        alert("USDC contract address not configured. Set NEXT_PUBLIC_USDC_ADDRESS.");
        return;
      }
      const usdc = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDC_ABI, signer);
      const escrow = new ethers.Contract(CONTRACT_ADDRESSES.P2PEscrow, ESCROW_ABI, signer);
      
      const amount = ethers.parseUnits(escrowAmount, 6);

      // 1. Approve USDC
      const approveTx = await usdc.approve(CONTRACT_ADDRESSES.P2PEscrow, amount);
      await approveTx.wait();

      // 2. Create Order
      const createTx = await escrow.createOrder(amount);
      await createTx.wait();

      alert("Escrow order created! Awaiting P2P Agent.");
      setEscrowAmount("");
    } catch (error) {
      console.error(error);
      alert("Failed to create escrow order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Merchant Portal</h1>
          <p className="text-muted">Manage your inventory and cash out your crypto earnings to fiat.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-border">
        <button 
          onClick={() => setActiveTab("inventory")}
          className={`pb-4 px-2 font-medium text-lg border-b-2 transition-colors ${activeTab === "inventory" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
        >
          Inventory Manager
        </button>
        <button 
          onClick={() => setActiveTab("escrow")}
          className={`pb-4 px-2 font-medium text-lg border-b-2 transition-colors ${activeTab === "escrow" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
        >
          Fiat Offramp
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-6">
        {activeTab === "inventory" ? (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <PackageOpen className="w-6 h-6 mr-3 text-primary" />
                List New Product
              </h2>
              <form onSubmit={handleListProduct} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name</label>
                  <input type="text" className="input-field" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Ledger Nano S" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (USDC)</label>
                  <input type="number" step="0.01" className="input-field" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="e.g., 59.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                  <input type="number" className="input-field" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="e.g., 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input type="url" className="input-field" required value={form.image} onChange={e => setForm({...form, image: e.target.value})} placeholder="https://..." />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  {loading ? "Listing on-chain..." : "List Product"}
                </button>
              </form>
            </div>

            <div className="bg-surface rounded-2xl p-8 border border-border flex flex-col justify-center items-center text-center">
              <h3 className="text-xl font-semibold mb-4">Your Active Listings</h3>
              <p className="text-muted mb-6">You currently have no products listed. Add your first product to start selling securely via HashKey!</p>
              {/* In a full app, map over fetched products here */}
            </div>
          </div>
        ) : (
          <div className="card max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <DollarSign className="w-6 h-6 mr-3 text-primary" />
              Cash Out to Fiat
            </h2>
            <p className="text-muted mb-8">
              Create a P2P Escrow order. Your USDC will be locked in the smart contract until a verified P2P Agent sends fiat to your registered bank account.
            </p>
            <form onSubmit={handleCreateEscrow} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Amount to Sell (USDC)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-muted font-medium">$</span>
                  </div>
                  <input 
                    type="number" 
                    step="1" 
                    className="input-field pl-8" 
                    required 
                    value={escrowAmount} 
                    onChange={e => setEscrowAmount(e.target.value)} 
                    placeholder="100" 
                  />
                </div>
              </div>
              
              <div className="bg-surface-strong p-4 rounded-xl text-sm border border-border">
                <span className="font-semibold text-foreground">Note:</span> You will need to approve two transactions: first to approve the USDC spend, then to create the escrow order.
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? "Processing..." : "Create Escrow Order"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
