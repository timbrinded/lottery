import { http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Arc Testnet Chain Configuration
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"], // Replace with actual Arc testnet RPC
    },
    public: {
      http: [
        "https://rpc.blockdaemon.testnet.arc.network",
        "https://rpc.drpc.testnet.arc.network",
        "https://rpc.quicknode.testnet.arc.network",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.app", // Replace with actual Arc testnet explorer
    },
  },
  testnet: true,
});

// Arc Mainnet Chain Configuration
export const arcMainnet = defineChain({
  id: 5678, // Replace with actual Arc mainnet chain ID
  name: "Arc",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.arc.network"], // Replace with actual Arc mainnet RPC
    },
    public: {
      http: ["https://rpc.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.arc.network", // Replace with actual Arc mainnet explorer
    },
  },
  testnet: false,
});

// Determine which chain to use based on environment
const isDevelopment = import.meta.env.DEV;
export const arcChain = isDevelopment ? arcTestnet : arcMainnet;

// Wagmi configuration with RainbowKit
export const config = getDefaultConfig({
  appName: "Mystery Lottery",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID", // Get from WalletConnect Cloud
  chains: [arcChain],
  transports: {
    [arcChain.id]: http(),
  },
  ssr: false,
});
