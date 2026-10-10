import { describe, expect, it } from "vitest";
import { CHAINS, getChainConfig } from "../../../src/config/chains";
import { createPlainSignPublicClient } from "../../../src/config/publicRpc";
import { getAllowlistEntry } from "../../../src/enrich/allowlist";

describe("chain registry", () => {
  it("uses Ethereum L1 services and mainnet metadata for chain 1", () => {
    const client = createPlainSignPublicClient(1);
    expect(client.chain.id).toBe(1);
    expect(client.chain.testnet).toBe(false);
    expect(getChainConfig(1)?.blockscoutBaseUrl).toBe("https://eth.blockscout.com/api/v2/");
  });

  it("isolates known WETH addresses by network", () => {
    expect(getAllowlistEntry(1, CHAINS[1].wethAddress)?.protocol).toContain("WETH");
    expect(getAllowlistEntry(11155111, CHAINS[1].wethAddress)).toBeUndefined();
    expect(getAllowlistEntry(1, CHAINS[11155111].wethAddress)).toBeUndefined();
    expect(getChainConfig(999999)).toBeUndefined();
  });
});
