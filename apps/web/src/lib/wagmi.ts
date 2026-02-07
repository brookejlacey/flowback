import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export const config = createConfig(
  getDefaultConfig({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http("https://sepolia.base.org"),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "",
    appName: "FlowBack",
    appDescription: "Trustless creator payments powered by Chainlink CRE",
  })
);
