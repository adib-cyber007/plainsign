import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";

import { config as loadEnv } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

loadEnv();

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url:
        process.env.VITE_SEPOLIA_RPC?.trim() ||
        "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: { sepolia: "blockscout-keyless" },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
