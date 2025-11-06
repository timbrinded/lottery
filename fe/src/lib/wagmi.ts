import { http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Localhost Chain Configuration (Anvil)
// Use chain ID 31337 (Anvil default) to force network switch prompt
// NOTE: Anvil uses 18 decimals by default (ETH standard), not 6 like Arc's USDC
export const localhost = defineChain({
  id: 31337, // Anvil default chain ID
  name: "Localhost",
  nativeCurrency: {
    name: "ETH", // Anvil uses ETH with 18 decimals, not USDC
    symbol: "ETH",
    decimals: 18, // Anvil default is 18 decimals
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});

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
// export const arcMainnet = defineChain({
//   id: 5678, // Replace with actual Arc mainnet chain ID
//   name: "Arc",
//   nativeCurrency: {
//     name: "USDC",
//     symbol: "USDC",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://rpc.arc.network"], // Replace with actual Arc mainnet RPC
//     },
//     public: {
//       http: ["https://rpc.arc.network"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Arc Explorer",
//       url: "https://explorer.arc.network", // Replace with actual Arc mainnet explorer
//     },
//   },
//   testnet: false,
// });

// Determine available chains based on environment
const isDevelopment = import.meta.env.LOCAL_MODE;

// In development, allow switching between all networks
// In production, only show mainnet
export const availableChains = isDevelopment
  ? [localhost, arcTestnet]
  : [arcTestnet];

// Log available networks
console.log(
  "🌐 Available networks:",
  availableChains.map((c) => c.name).join(", ")
);

// Wagmi configuration with RainbowKit
export const config = getDefaultConfig({
  appName: "Mystery Lottery",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID", // Get from WalletConnect Cloud
  chains: availableChains as any,
  transports: {
    [localhost.id]: http(),
    [arcTestnet.id]: http(),
    // [arcMainnet.id]: http(),
  },
  ssr: false,
});
