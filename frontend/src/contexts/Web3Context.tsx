"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

export const CONTRACT_ADDRESSES = {
  IdentityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ?? "",
  ProductRegistry: process.env.NEXT_PUBLIC_PRODUCT_REGISTRY_ADDRESS ?? "",
  P2PEscrow: process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS ?? "",
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "",
  Verifier: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS ?? "",
};

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  role: number; // 0 = Unverified, 1 = Merchant, 2 = Agent
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  address: null,
  role: 0,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isLoading: true,
});

type EthereumProvider = ethers.Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
};

const getEthereum = (): EthereumProvider | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  return w.ethereum ?? null;
};

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const checkRole = async (userAddress: string, ethersProvider: ethers.BrowserProvider) => {
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESSES.IdentityRegistry)) {
        setRole(0);
        return;
      }
      // Mocking the IdentityRegistry ABI just for the getUserRole function
      const identityAbi = ["function getUserRole(address user) external view returns (uint256)"];
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.IdentityRegistry, identityAbi, ethersProvider);
      
      const userRole = await contract.getUserRole(userAddress);
      setRole(Number(userRole));
    } catch (error) {
      console.error("Failed to fetch role, defaulting to 0", error);
      setRole(0);
    }
  };

  const connectWallet = async () => {
    const ethereum = getEthereum();
    if (ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        const ethersSigner = await browserProvider.getSigner();
        const userAddress = await ethersSigner.getAddress();
        
        setProvider(browserProvider);
        setSigner(ethersSigner);
        setAddress(userAddress);
        
        await checkRole(userAddress, browserProvider);
      } catch (error) {
        console.error("User rejected request or error occurred", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setRole(0);
  };

  useEffect(() => {
    const init = async () => {
      const ethereum = getEthereum();
      if (ethereum) {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        const accounts = await browserProvider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const ethersSigner = await browserProvider.getSigner();
          const userAddress = await ethersSigner.getAddress();
          setProvider(browserProvider);
          setSigner(ethersSigner);
          setAddress(userAddress);
          await checkRole(userAddress, browserProvider);
        }
      }
      setIsLoading(false);
    };
    init();

    const ethereum = getEthereum();
    if (ethereum?.on) {
      ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
      ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, address, role, connectWallet, disconnectWallet, isLoading }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
