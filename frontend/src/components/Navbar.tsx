"use client";

import Link from "next/link";
import { useWeb3 } from "@/contexts/Web3Context";
import { Wallet, LogOut, ShieldCheck, UserCheck } from "lucide-react";

export function Navbar() {
  const { address, role, connectWallet, disconnectWallet } = useWeb3();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">H</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Hashzkfinance</span>
            </Link>
            
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium">HashBazaar</Link>
              <Link href="/merchant" className="text-foreground hover:text-primary transition-colors font-medium">Merchants</Link>
              <Link href="/agent" className="text-foreground hover:text-primary transition-colors font-medium">P2P Escrow</Link>
              <Link href="/contracts" className="text-foreground hover:text-primary transition-colors font-medium">Contracts</Link>
              {role === 0 && (
                <Link href="/kyc" className="text-foreground hover:text-primary transition-colors font-medium">Get Verified</Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <Link href="/contracts" className="btn-outline px-5 py-2 text-sm">View Contracts</Link>
              <Link href="/marketplace" className="btn-primary px-5 py-2 text-sm">Launch App</Link>
            </div>
            {address ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex items-center px-3 py-1 bg-surface rounded-full border border-border">
                  {role === 1 && <ShieldCheck className="w-4 h-4 text-primary mr-2" />}
                  {role === 2 && <UserCheck className="w-4 h-4 text-primary mr-2" />}
                  <span className="text-sm font-medium text-foreground">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="p-2 text-muted hover:text-foreground transition-colors bg-surface hover:bg-surface-strong rounded-full border border-border"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className="btn-primary flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
