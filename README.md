# HashBazaar (Hashzkfinance) — HashKey Hackathon Submission

HashBazaar is a compliant PayFi marketplace built on HashKey Chain:
- **Merchants** become verified (ZK identity) and list products on-chain
- **Buyers** pay via **HashKey Checkout** (backend webhook → on-chain receipt)
- **Merchants** cash out to fiat using a **P2P escrow offramp** (agent network)

This repo contains the full stack: smart contracts, backend relayer/webhook, and a judge-ready frontend.

## Problem
Real-world commerce needs:
- Compliance (KYC/role gating) without leaking sensitive identity data
- Reliable settlement rails (HashKey Checkout + verified webhooks)
- A last-mile fiat offramp for merchants (especially in emerging markets)

## Solution
HashBazaar combines:
- **ZK Identity Registry** (soulbound role NFT) to gate merchant/agent actions
- **On-chain Product Registry** (inventory + idempotent purchases)
- **P2P Escrow** for crypto↔fiat settlement coordination
- **Backend webhook verifier + relayer** to securely bridge HashKey payment events to on-chain state

## What’s Built
### Smart Contracts
- [IdentityRegistry.sol](file:///workspace/contracts/IdentityRegistry.sol): ZK proof verification + soulbound Identity NFT + O(1) role lookup
- [ProductRegistry.sol](file:///workspace/contracts/ProductRegistry.sol): merchant listings, stock enforcement, idempotent on-chain purchase receipts
- [P2PEscrow.sol](file:///workspace/contracts/P2PEscrow.sol): merchant cash-out orders, agent acceptance, merchant release, admin dispute resolution

### Backend (Express)
- Creates HashKey orders and redirects the buyer to checkout
- Verifies signed webhooks (HMAC) and records purchases on-chain via a relayer
- Key code:
  - [paymentRoutes.ts](file:///workspace/backend/src/routes/paymentRoutes.ts)
  - [webhookRoutes.ts](file:///workspace/backend/src/routes/webhookRoutes.ts)
  - [hashkeyService.ts](file:///workspace/backend/src/services/hashkeyService.ts)
  - [productRegistryService.ts](file:///workspace/backend/src/services/productRegistryService.ts)

### Frontend (Next.js)
Professional landing + flow explainer + marketplace app:
- `/` Landing (investor/judge overview)
- `/marketplace` Marketplace (HashKey checkout)
- `/kyc` Identity/KYC minting
- `/merchant` Merchant dashboard (list products, create escrow order)
- `/agent` Agent dashboard (accept escrow orders)
- `/contracts` Contract addresses + copy/explorer links

## Deployed Contracts (HashKey Testnet)
Latest deployment details are written to:
- [deployed-addresses.txt](file:///workspace/deployed-addresses.txt)

Current addresses:
- Groth16Verifier: `0x238D45EF88697A2692DA0A2059317c9410B2c1B9`
- IdentityRegistry: `0x28F756Fb7406d03b7DC48907d029902f9024ac16`
- MockUSDC: `0x3d819f463FDefb6289B7874C8645fd4e5DB8c100`
- P2PEscrow: `0x6C16aFe474F717058376329f9EDEbb8fe16ef794`
- ProductRegistry: `0xD052fdaFc9Ab3207c6f26398f1E53A8f5a2c4276`

## Verified End-to-End Testnet Flow
We run a real testnet flow that:
1) Funds merchant/agent wallets
2) Mints merchant + agent identities via Groth16 proof
3) Lists a product
4) Records a purchase (relayer/owner call)
5) Creates an escrow order → agent accepts → merchant releases funds

Test script:
- [test-deployed-flow.js](file:///workspace/scripts/test-deployed-flow.js)

All tx hashes (deployment + flow) are saved in:
- [transactions.md](file:///workspace/transactions.md)

## How To Deploy
Deployment script:
- [deploy.js](file:///workspace/scripts/deploy.js)

Command:
```bash
npx hardhat run scripts/deploy.js --network hashkeyTestnet
```

## How To Run (Local)
### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
Create `frontend/.env.local` with the deployed addresses:
```bash
NEXT_PUBLIC_VERIFIER_ADDRESS=...
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=...
NEXT_PUBLIC_USDC_ADDRESS=...
NEXT_PUBLIC_P2P_ESCROW_ADDRESS=...
NEXT_PUBLIC_PRODUCT_REGISTRY_ADDRESS=...
```

Run:
```bash
cd frontend
npm install
npm run dev
```
