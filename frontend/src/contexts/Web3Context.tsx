"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

// Hardcoded for the Hackathon Demo
export const CONTRACT_ADDRESSES = {
  IdentityRegistry: "0xYourIdentityRegistryAddressHere", // TODO: Update after deployment
  ProductRegistry: "0xYourProductRegistryAddressHere",
  P2PEscrow: "0xYourEscrowAddressHere"
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

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const checkRole = async (userAddress: string, ethersProvider: ethers.BrowserProvider) => {
    try {
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
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
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
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
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

    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', () => {
        window.location.reload();
      });
      (window as any).ethereum.on('chainChanged', () => {
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