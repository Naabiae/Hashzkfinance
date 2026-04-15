"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

type ContractRow = {
  label: string;
  envKey: string;
  address: string | undefined;
};

function isAddressLike(v: string | undefined) {
  return typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v);
}

export default function ContractsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const rows: ContractRow[] = useMemo(
    () => [
      {
        label: "IdentityRegistry",
        envKey: "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS",
        address: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS,
      },
      {
        label: "ProductRegistry",
        envKey: "NEXT_PUBLIC_PRODUCT_REGISTRY_ADDRESS",
        address: process.env.NEXT_PUBLIC_PRODUCT_REGISTRY_ADDRESS,
      },
      {
        label: "P2PEscrow",
        envKey: "NEXT_PUBLIC_P2P_ESCROW_ADDRESS",
        address: process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS,
      },
      {
        label: "USDC (Mock/Testnet)",
        envKey: "NEXT_PUBLIC_USDC_ADDRESS",
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS,
      },
      {
        label: "Groth16Verifier",
        envKey: "NEXT_PUBLIC_VERIFIER_ADDRESS",
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS,
      },
    ],
    []
  );

  const explorerBase = process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ?? "https://hashkey.blockscout.com";

  const onCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-surface-strong border border-border rounded-[var(--radius-lg)] p-10">
        <h1 className="text-4xl font-bold tracking-tight">Contracts</h1>
        <p className="mt-3 text-muted text-lg max-w-2xl">
          Set these as environment variables in the frontend to enable live contract reads/writes.
          Deployment is driven by the Hardhat script at{" "}
          <span className="font-mono">scripts/deploy.js</span>.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted">
          <div className="col-span-3">Contract</div>
          <div className="col-span-5">Address</div>
          <div className="col-span-4">Environment Key</div>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => {
            const ok = isAddressLike(r.address);
            return (
              <div key={r.label} className="grid grid-cols-12 gap-4 px-6 py-5 items-center">
                <div className="col-span-3 font-semibold">{r.label}</div>
                <div className="col-span-5">
                  {ok ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{r.address}</span>
                      <button
                        onClick={() => onCopy(r.address!)}
                        className="p-2 rounded-full border border-border bg-surface hover:bg-surface-strong transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        className="p-2 rounded-full border border-border bg-surface hover:bg-surface-strong transition-colors"
                        href={`${explorerBase}/address/${r.address}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {copied === r.address && <span className="text-xs text-primary font-semibold">Copied</span>}
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Not set</span>
                  )}
                </div>
                <div className="col-span-4">
                  <span className="font-mono text-xs text-muted">{r.envKey}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-background p-8">
        <div className="text-sm text-muted">
          Run deployment on HashKey testnet:
          <div className="mt-3 bg-surface border border-border rounded-[var(--radius-md)] p-4 font-mono text-xs text-foreground overflow-x-auto">
            npx hardhat run scripts/deploy.js --network hashkeyTestnet
          </div>
          <div className="mt-3">
            Paste the printed addresses into a frontend{" "}
            <span className="font-mono">.env.local</span> file.
          </div>
        </div>
      </div>
    </div>
  );
}

