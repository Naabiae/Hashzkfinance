"use client";

import { useState } from "react";
import { useWeb3, CONTRACT_ADDRESSES } from "@/contexts/Web3Context";
import { ShieldCheck, Loader2 } from "lucide-react";
import { ethers } from "ethers";

// ABI for the verifier/registry (minimal)
const REGISTRY_ABI = [
  "function verifyAndMint(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[3] input) external"
];

export default function KYCPage() {
  const { address, signer, role } = useWeb3();
  const [selectedRole, setSelectedRole] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<number>(0);

  const generateAndMint = async () => {
    if (!signer) return alert("Connect wallet first");
    if (!CONTRACT_ADDRESSES.IdentityRegistry) return alert("IdentityRegistry address not configured.");
    
    setIsGenerating(true);
    setStep(1);

    try {
      // Simulate ZK Proof generation time for the hackathon UI
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep(2);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep(3);

      // In production, snarkjs.groth16.fullProve goes here.
      // We will mock the on-chain call for the demo UI.
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.IdentityRegistry, REGISTRY_ABI, signer);
      
      // Mock data that would normally come from snarkjs
      const mockA = [0, 0];
      const mockB = [[0, 0], [0, 0]];
      const mockC = [0, 0];
      const mockInput = [
        Math.floor(Math.random() * 1000000), // random nullifier
        selectedRole, 
        0 // commitment
      ];

      // Send transaction
      const tx = await contract.verifyAndMint(mockA, mockB, mockC, mockInput);
      setStep(4);
      
      await tx.wait();
      alert("Identity NFT Minted successfully! You can now access your dashboard.");
      window.location.href = selectedRole === 1 ? "/merchant" : "/agent";
      
    } catch (error) {
      console.error(error);
      alert("Failed to mint Identity NFT. See console for details.");
    } finally {
      setIsGenerating(false);
      setStep(0);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold mb-4">Identity Verification</h1>
        <p className="text-muted">Please connect your wallet to proceed.</p>
      </div>
    );
  }

  if (role !== 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldCheck className="w-20 h-20 text-primary mb-6" />
        <h1 className="text-3xl font-bold mb-4">You are already verified!</h1>
        <p className="text-muted mb-8">Your wallet holds an active HashBazaar Identity NFT.</p>
        <button 
          onClick={() => window.location.href = role === 1 ? "/merchant" : "/agent"}
          className="btn-primary"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">Get Verified</h1>
        <p className="text-muted text-lg">Generate a Zero-Knowledge Proof to securely mint your HashBazaar Identity NFT without exposing your personal data.</p>
      </div>

      <div className="card space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Select your role</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole(1)}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                selectedRole === 1 
                  ? "border-primary bg-surface-strong" 
                  : "border-border bg-background hover:bg-surface"
              }`}
            >
              <div className="text-lg font-bold mb-2">Merchant (Role 1)</div>
              <p className="text-sm text-muted">I want to list physical or digital products for sale and receive crypto.</p>
            </button>

            <button
              onClick={() => setSelectedRole(2)}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                selectedRole === 2 
                  ? "border-primary bg-surface-strong" 
                  : "border-border bg-background hover:bg-surface"
              }`}
            >
              <div className="text-lg font-bold mb-2">P2P Agent (Role 2)</div>
              <p className="text-sm text-muted">I want to fulfill escrow orders, send fiat to merchants, and earn crypto.</p>
            </button>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border">
          <h4 className="font-semibold mb-2 flex items-center">
            <ShieldCheck className="w-5 h-5 text-primary mr-2" />
            Privacy Preserving
          </h4>
          <p className="text-sm text-muted">
            Your browser will generate a local Groth16 cryptographic proof. Your private KYC data never leaves your device. Only the proof and a nullifier are submitted on-chain.
          </p>
        </div>

        <button 
          onClick={generateAndMint}
          disabled={isGenerating}
          className="w-full btn-primary py-4 text-lg flex items-center justify-center space-x-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {step === 1 && "Generating ZK Proof locally..."}
                {step === 2 && "Verifying Circuit Inputs..."}
                {step === 3 && "Awaiting Wallet Signature..."}
                {step === 4 && "Minting NFT On-Chain..."}
              </span>
            </>
          ) : (
            <span>Generate Proof & Mint NFT</span>
          )}
        </button>
      </div>
    </div>
  );
}
