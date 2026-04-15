"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  FileSearch,
  Globe,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { CONTRACT_ADDRESSES } from "@/contexts/Web3Context";
import { compactAddress } from "@/lib/format";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.18),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(28,27,24,0.10),transparent_60%)]" />
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 lg:p-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-foreground border border-border text-xs font-semibold tracking-wide uppercase">
              <BadgeCheck className="w-4 h-4" />
              HashKey Testnet Live
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight leading-[1.02]">
              Compliant commerce rails for Web3 merchants.
            </h1>
            <p className="mt-5 text-lg text-muted max-w-xl">
              HashBazaar combines ZK identity, HashKey checkout, and a P2P escrow
              offramp—so merchants can sell globally and settle locally.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" className="btn-primary inline-flex items-center gap-2">
                Open Marketplace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/kyc" className="btn-outline inline-flex items-center gap-2">
                Get Verified <ShieldCheck className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
                <div className="text-muted font-semibold uppercase tracking-wide">Identity</div>
                <div className="mt-1 font-medium">Soulbound role NFT</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
                <div className="text-muted font-semibold uppercase tracking-wide">Settlement</div>
                <div className="mt-1 font-medium">Signed webhooks</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
                <div className="text-muted font-semibold uppercase tracking-wide">Offramp</div>
                <div className="mt-1 font-medium">P2P escrow</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-strong shadow-sm">
            <Image
              src="https://storage.googleapis.com/banani-generated-images/generated-images/e61aac24-c9bd-4456-a2ec-ac030fd07060.jpg"
              alt="HashBazaar interface preview"
              width={1400}
              height={1050}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
          <div className="h-11 w-11 rounded-[var(--radius-md)] bg-surface-strong border border-border flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Compliance-first onboarding</h2>
          <p className="mt-2 text-sm text-muted max-w-none">
            ZK identity verification gates merchant and agent actions without revealing private KYC data on-chain.
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
          <div className="h-11 w-11 rounded-[var(--radius-md)] bg-surface-strong border border-border flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">HashKey checkout settlement</h2>
          <p className="mt-2 text-sm text-muted max-w-none">
            Buyers pay in a familiar flow. Webhooks are verified and purchases are finalized on-chain via a relayer.
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
          <div className="h-11 w-11 rounded-[var(--radius-md)] bg-surface-strong border border-border flex items-center justify-center">
            <Workflow className="w-5 h-5" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">P2P offramp network</h2>
          <p className="mt-2 text-sm text-muted max-w-none">
            Merchants convert USDC to fiat using escrow orders accepted by verified agents. Disputes are resolvable by admin for safety.
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-10">
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-wide uppercase text-muted inline-flex items-center gap-2">
              <FileSearch className="w-4 h-4" />
              Live contracts
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Transparent, auditable primitives</h2>
            <p className="mt-3 text-muted text-lg max-w-none">
              The marketplace is enforced by on-chain state: identity roles, listings, and escrow lifecycle. Frontend reads are pulled directly from testnet.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wide">IdentityRegistry</div>
              <div className="mt-1 font-mono">{compactAddress(CONTRACT_ADDRESSES.IdentityRegistry)}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wide">ProductRegistry</div>
              <div className="mt-1 font-mono">{compactAddress(CONTRACT_ADDRESSES.ProductRegistry)}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wide">P2PEscrow</div>
              <div className="mt-1 font-mono">{compactAddress(CONTRACT_ADDRESSES.P2PEscrow)}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wide">Network</div>
              <div className="mt-1 font-medium inline-flex items-center gap-2">
                <Globe className="w-4 h-4" />
                HashKey Testnet (133)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
