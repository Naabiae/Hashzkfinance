"use client";

import { useMemo, useState } from "react";
import { useWeb3, CONTRACT_ADDRESSES } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import {
  ArrowUpRight,
  BarChart3,
  DollarSign,
  HandCoins,
  PackageOpen,
  PlusCircle,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatUSDCFrom6 } from "@/lib/format";
import { useMerchantInsights } from "@/hooks/useMerchantInsights";

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

  const { products, analytics, totals, error, refresh, loading: insightsLoading } = useMerchantInsights();

  const productRows = useMemo(() => {
    return products.map((p) => {
      let meta: { name?: string; image?: string } = {};
      try {
        meta = JSON.parse(p.metadataURI || "{}");
      } catch {}

      const sold = p.sold;
      const price = p.priceUSDC;
      const revenue = sold * price;

      const stock = p.isUnlimitedStock ? null : p.stock;
      const progress =
        stock && stock > BigInt(0) ? Number((sold * BigInt(100)) / stock) : 0;

      return {
        id: p.id,
        name: meta.name ?? `Product #${p.id}`,
        active: p.isActive,
        price,
        sold,
        stock,
        revenue,
        progress: Math.max(0, Math.min(100, progress)),
      };
    });
  }, [products]);

  if (role !== 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-bold mb-3">Merchant Dashboard</h1>
        <p className="text-muted max-w-lg">
          This page is available to verified merchants only. Mint an Identity NFT on the verification page to unlock inventory and earnings.
        </p>
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
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted">
            <BarChart3 className="w-4 h-4" />
            Merchant Analytics
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Performance Overview</h1>
          <p className="mt-3 text-muted max-w-2xl">
            Live metrics combine on-chain product state with backend HashKey checkout activity.
          </p>
        </div>
        <button onClick={refresh} className="btn-outline inline-flex items-center gap-2">
          <RefreshCcw className={insightsLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 text-sm text-muted">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Gross On-chain Revenue" value={`$${formatUSDCFrom6(totals.revenue)}`} hint="Based on ProductRegistry.sold * price" Icon={DollarSign} accent />
        <MetricCard label="Units Sold" value={`${totals.sold.toString()}`} hint="All products listed by this wallet" Icon={ShoppingCart} />
        <MetricCard label="Active Listings" value={`${totals.active}/${totals.listings}`} hint="Products currently active" Icon={PackageOpen} />
        <MetricCard
          label="Paid Checkouts (Backend)"
          value={`${analytics?.counts.paidOrders ?? 0}`}
          hint={`Total paid volume: $${analytics?.totals.totalPaidAmount ?? 0}`}
          Icon={HandCoins}
        />
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
          <div className="grid lg:grid-cols-2 gap-8">
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

            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">Your Listings</h3>
                <div className="text-xs text-muted">On-chain source: ProductRegistry</div>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted">
                      <th className="text-left py-3">Item</th>
                      <th className="text-right py-3">Price</th>
                      <th className="text-right py-3">Sold</th>
                      <th className="text-right py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-muted">
                          No listings yet. Create your first product to start selling.
                        </td>
                      </tr>
                    ) : (
                      productRows.map((r) => (
                        <tr key={r.id} className="align-top">
                          <td className="py-4 pr-4">
                            <div className="font-medium text-foreground">{r.name}</div>
                            <div className="mt-1 text-xs text-muted">
                              #{r.id} · {r.active ? "Active" : "Inactive"}{" "}
                              {r.stock ? `· Stock ${r.stock.toString()}` : r.stock === null ? "· Unlimited" : ""}
                            </div>
                            {r.stock ? (
                              <div className="mt-3 h-1.5 w-full bg-surface-strong rounded-full overflow-hidden border border-border">
                                <div className="h-full bg-foreground" style={{ width: `${r.progress}%` }} />
                              </div>
                            ) : null}
                          </td>
                          <td className="py-4 text-right font-mono">${formatUSDCFrom6(r.price)}</td>
                          <td className="py-4 text-right font-mono">{r.sold.toString()}</td>
                          <td className="py-4 text-right font-mono">${formatUSDCFrom6(r.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totals.top ? (
                <div className="mt-6 rounded-[var(--radius-md)] border border-border bg-surface-strong p-4 text-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted font-semibold">Top Product</div>
                    <div className="mt-1 font-medium text-foreground">
                      {(() => {
                        try {
                          const m = JSON.parse(totals.top.metadataURI || "{}");
                          return m.name ?? `Product #${totals.top.id}`;
                        } catch {
                          return `Product #${totals.top.id}`;
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-mono">
                    ${formatUSDCFrom6(totals.top.sold * totals.top.priceUSDC)}
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              ) : null}
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
