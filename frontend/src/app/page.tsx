"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightLeft,
  Building2,
  CreditCard,
  Fingerprint,
  Hexagon,
  ShieldCheck,
  Store,
  Zap,
} from "lucide-react";

const flow = [
  {
    step: "1",
    title: "Merchant KYC",
    description:
      "Merchants verify through the HashKey-aligned compliance flow. Identity is represented on-chain via a role-gated credential.",
    Icon: Fingerprint,
  },
  {
    step: "2",
    title: "On-chain Listing",
    description:
      "Verified merchants list goods with transparent pricing and inventory rules enforced by smart contracts.",
    Icon: Store,
  },
  {
    step: "3",
    title: "PayFi Settlement",
    description:
      "Buyers pay through HashKey checkout. Webhooks finalize settlement and the purchase is reflected on-chain via a relayer.",
    Icon: CreditCard,
  },
  {
    step: "4",
    title: "P2P Escrow Ramp",
    description:
      "Merchants offramp to fiat: escrow locks USDC, agents complete the off-chain leg, and funds are released on confirmation.",
    Icon: ArrowRightLeft,
  },
];

const modules = [
  {
    title: "Identity Registry",
    subtitle: "Compliance & access control",
    description:
      "Role-gated identity for Merchants and P2P Agents. Prevents permissionless listing and enables compliant workflows end-to-end.",
    pills: ["Role NFT", "ZK Proof", "O(1) Role Lookup"],
    Icon: ShieldCheck,
    accent: true,
  },
  {
    title: "Product Registry",
    subtitle: "On-chain inventory",
    description:
      "Products are listed by verified merchants and purchases are recorded with idempotency and stock enforcement.",
    pills: ["Inventory", "Idempotency", "USDC Pricing"],
    Icon: Building2,
  },
  {
    title: "P2P Escrow",
    subtitle: "Fiat offramp rail",
    description:
      "Escrow orders coordinate on-chain settlement for off-chain fiat transfers with admin dispute resolution for hackathon safety.",
    pills: ["Escrow", "Arbitration", "Agent Network"],
    Icon: ArrowRightLeft,
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20">
      <section className="pt-10">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
          <div className="absolute inset-0 opacity-[0.06] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 lg:p-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-foreground border border-border text-sm font-medium">
                <Zap className="w-4 h-4" />
                Hackathon Testnet Live
              </div>
              <h1 className="mt-6 text-5xl leading-[1.02] font-bold tracking-tight">
                Compliant PayFi Meets Global Commerce
              </h1>
              <p className="mt-5 text-lg text-muted max-w-xl">
                HashBazaar bridges DeFi and real-world commerce with a compliant
                identity layer, HashKey checkout, and a P2P escrow offramp for
                merchants.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/kyc" className="btn-primary">
                  Merchant Onboarding
                </Link>
                <Link href="/marketplace" className="btn-secondary">
                  Browse Marketplace
                </Link>
                <Link href="/contracts" className="btn-outline">
                  View Contracts
                </Link>
              </div>
              <div className="mt-7 flex items-center gap-3 text-sm text-muted">
                <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                Powered by HashKey-aligned compliance + signed webhooks
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[var(--card)] shadow-lg">
              <Image
                src="https://storage.googleapis.com/banani-generated-images/generated-images/e61aac24-c9bd-4456-a2ec-ac030fd07060.jpg"
                alt="HashBazaar Dashboard"
                width={1280}
                height={960}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] bg-secondary/60 border border-border p-10 lg:p-14">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-primary font-semibold text-xs tracking-[0.18em] uppercase">
            Frictionless Architecture
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            The Compliant Commerce Flow
          </h2>
          <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
            A complete end-to-end payment rail designed for merchants, buyers,
            and P2P fiat liquidity providers.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {flow.map(({ step, title, description, Icon }) => (
            <div
              key={step}
              className="relative rounded-[var(--radius-lg)] border border-border bg-[var(--card)] p-7"
            >
              <div className="absolute top-5 right-5 text-5xl font-bold text-border/60 leading-none select-none">
                {step}
              </div>
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-primary flex items-center justify-center">
                <Icon className="w-6 h-6 text-[var(--primary-foreground)]" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted max-w-none">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <span className="text-primary font-semibold text-xs tracking-[0.18em] uppercase">
            Under the Hood
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Built for the HashKey Ecosystem
          </h2>
          <p className="mt-4 text-lg text-muted max-w-2xl">
            Modular smart contracts + backend relayer glue. Easy to audit, easy
            to demo, and aligned with compliant PayFi.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {modules.map(({ title, subtitle, description, pills, Icon, accent }) => (
            <div
              key={title}
              className={[
                "rounded-[var(--radius-lg)] border p-9",
                accent ? "bg-primary text-[var(--primary-foreground)] border-transparent" : "bg-[var(--card)] border-border",
              ].join(" ")}
            >
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-background/20 flex items-center justify-center">
                <Icon className={accent ? "w-6 h-6 text-white" : "w-6 h-6 text-primary"} />
              </div>
              <div className="mt-6">
                <div className={accent ? "text-white/90 text-sm font-medium" : "text-muted text-sm font-medium"}>
                  {subtitle}
                </div>
                <h3 className={accent ? "mt-2 text-2xl font-semibold text-white" : "mt-2 text-2xl font-semibold"}>
                  {title}
                </h3>
                <p className={accent ? "mt-3 text-white/90 text-sm max-w-none" : "mt-3 text-muted text-sm max-w-none"}>
                  {description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {pills.map((p) => (
                    <span
                      key={p}
                      className={[
                        "px-3 py-1 rounded-full text-xs font-semibold border",
                        accent ? "bg-white/15 text-white border-white/20" : "bg-secondary/50 text-foreground border-border",
                      ].join(" ")}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-10 lg:p-14">
        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Hexagon className="w-4 h-4" />
              Investor-ready demo
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Show the full stack in under 2 minutes
            </h2>
            <p className="mt-3 text-muted text-lg max-w-none">
              Judges can verify on-chain enforcement, signed webhook processing,
              and the escrow offramp loop with clear UX and contract links.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/marketplace" className="btn-primary">
              Launch App
            </Link>
            <Link href="/contracts" className="btn-outline inline-flex items-center gap-2">
              Contract Addresses <ArrowRightLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
            <div className="text-muted font-medium">Security baseline</div>
            <div className="mt-2 font-semibold">Signed webhooks + idempotency</div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
            <div className="text-muted font-medium">Composability</div>
            <div className="mt-2 font-semibold">Contracts modular by role</div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
            <div className="text-muted font-medium">Real-world utility</div>
            <div className="mt-2 font-semibold">P2P fiat liquidity layer</div>
          </div>
        </div>
      </section>

      <footer className="pt-8 pb-4 text-sm text-muted">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center border-t border-border pt-6">
          <div>© {new Date().getFullYear()} Hashzkfinance. Built for HashKey Hackathon.</div>
          <div className="flex gap-4">
            <a className="hover:text-foreground transition-colors" href="/contracts">
              Contracts
            </a>
            <a className="hover:text-foreground transition-colors" href="/marketplace">
              App
            </a>
            <a className="hover:text-foreground transition-colors" href="/kyc">
              Verification
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
