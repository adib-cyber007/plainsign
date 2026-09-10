import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hardhat, sepolia } from "wagmi/chains";

const configuredChainId = Number.parseInt(
  import.meta.env.VITE_DEMO_CHAIN?.trim() || "31337",
  10,
);

export const demoChain = configuredChainId === sepolia.id ? sepolia : hardhat;

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected()],
  multiInjectedProviderDiscovery: false,
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC?.trim() ||
        "https://ethereum-sepolia-rpc.publicnode.com",
    ),
  },
});
