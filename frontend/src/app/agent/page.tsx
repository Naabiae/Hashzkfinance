"use client";

import { useWeb3, CONTRACT_ADDRESSES } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, CheckCircle, HandCoins, Loader2 } from "lucide-react";

// Minimal ABI for P2PEscrow
const ESCROW_ABI = [
  "function nextOrderId() external view returns (uint256)",
  "function orders(uint256) external view returns (uint256 id, address merchant, address agent, uint256 amount, uint8 status)",
  "function acceptOrder(uint256 orderId) external",
  "function releaseFunds(uint256 orderId) external" // For merchant testing
];

interface Order {
  id: number;
  merchant: string;
  agent: string;
  amount: string;
  status: number;
}

export default function AgentDashboard() {
  const { address, signer, role } = useWeb3();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!signer) return;
    setLoading(true);

    try {
      const escrow = new ethers.Contract(CONTRACT_ADDRESSES.P2PEscrow, ESCROW_ABI, signer);
      const count = Number(await escrow.nextOrderId());
      
      const fetchedOrders: Order[] = [];
      for (let i = 0; i < count; i++) {
        const order = await escrow.orders(i);
        fetchedOrders.push({
          id: Number(order.id),
          merchant: order.merchant,
          agent: order.agent,
          amount: ethers.formatUnits(order.amount, 6),
          status: Number(order.status)
        });
      }

      setOrders(fetchedOrders.reverse()); // Newest first
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [signer]);

  useEffect(() => {
    if (signer && role === 2) fetchOrders();
  }, [fetchOrders, role, signer]);

  const handleAcceptOrder = async (orderId: number) => {
    if (!signer) return;
    setProcessingId(orderId);

    try {
      const escrow = new ethers.Contract(CONTRACT_ADDRESSES.P2PEscrow, ESCROW_ABI, signer);
      const tx = await escrow.acceptOrder(orderId);
      await tx.wait();

      alert("Order accepted! Please send the fiat to the Merchant's bank account off-chain.");
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Failed to accept order.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1: return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Open</span>;
      case 2: return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Locked (Awaiting Fiat)</span>;
      case 3: return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Completed</span>;
      case 4: return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Cancelled</span>;
      case 5: return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Disputed</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Unknown</span>;
    }
  };

  if (role !== 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-muted">You need an Agent Identity NFT to view the Escrow Board.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center">
            <HandCoins className="w-8 h-8 mr-3 text-primary" />
            P2P Escrow Board
          </h1>
          <p className="text-muted">Accept merchant cash-out requests, transfer fiat, and earn USDC directly to your wallet.</p>
        </div>
        
        <button onClick={fetchOrders} className="btn-outline flex items-center space-x-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-surface-strong border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-5 bg-background p-4 border-b border-border text-sm font-bold text-muted uppercase tracking-wider">
          <div className="col-span-1">Order ID</div>
          <div className="col-span-1">Amount</div>
          <div className="col-span-1">Merchant</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-border">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-muted">
              {loading ? "Loading orders..." : "No orders found. Click refresh to check for new cash-out requests."}
            </div>
          ) : (
            orders.map((order, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={order.id} 
                className="grid grid-cols-5 p-4 items-center hover:bg-surface transition-colors"
              >
                <div className="col-span-1 font-mono font-medium">#{order.id}</div>
                <div className="col-span-1 font-bold text-lg text-foreground">${order.amount} <span className="text-xs text-muted font-normal">USDC</span></div>
                <div className="col-span-1 font-mono text-sm text-muted" title={order.merchant}>
                  {order.merchant.slice(0, 6)}...{order.merchant.slice(-4)}
                </div>
                <div className="col-span-1">
                  {getStatusBadge(order.status)}
                </div>
                <div className="col-span-1 text-right">
                  {order.status === 1 ? (
                    <button 
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={processingId === order.id}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {processingId === order.id ? "Locking..." : "Accept & Pay"}
                    </button>
                  ) : order.status === 2 && order.agent === address ? (
                    <div className="text-sm font-medium text-yellow-600 flex items-center justify-end">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Awaiting Release
                    </div>
                  ) : order.status === 3 ? (
                    <div className="text-sm font-medium text-green-600 flex items-center justify-end">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </div>
                  ) : (
                    <span className="text-muted text-sm">-</span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
