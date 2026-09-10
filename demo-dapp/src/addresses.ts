import type { Address } from "viem";

export interface Deployment {
  DemoNFT: Address;
  ClaimToken: Address;
  FakeMint: Address;
  WETH9?: Address;
  attacker: Address;
  deployedAt: string;
}

const deploymentFiles = import.meta.glob<Deployment>("./deployments/*.json", {
  eager: true,
  import: "default",
});

export function getDeployment(chainId: number): Deployment | undefined {
  return deploymentFiles[`./deployments/${chainId}.json`];
}
