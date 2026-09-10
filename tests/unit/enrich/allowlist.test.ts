import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import localDeployment from "../../../contracts/deployments/31337.json";
import {
  domainMatches,
  getAllowlistEntry,
} from "../../../src/enrich/allowlist";

describe("enrichment allowlist", () => {
  it("looks up addresses case-insensitively by chain", () => {
    const entry = getAllowlistEntry(
      1,
      "0xC02AAa39b223FE8D0A0E5C4F27eAD9083C756Cc2",
    );
    expect(entry?.protocol).toBe("Wrapped Ether (WETH)");
    expect(
      getAllowlistEntry(31337, localDeployment.WETH9 as Address),
    ).toEqual({
      protocol: "Wrapped Ether (WETH, local)",
      domains: ["*"],
    });
  });

  it("does not allowlist any local demo or attacker address", () => {
    for (const address of [
      localDeployment.DemoNFT,
      localDeployment.ClaimToken,
      localDeployment.FakeMint,
      localDeployment.attacker,
    ]) {
      expect(getAllowlistEntry(31337, address as Address)).toBeUndefined();
    }
  });

  it("matches exact domains, subdomains, and the wildcard without suffix tricks", () => {
    expect(domainMatches("https://uniswap.org", ["uniswap.org"])).toBe(true);
    expect(domainMatches("https://app.uniswap.org/swap", ["uniswap.org"])).toBe(
      true,
    );
    expect(domainMatches("https://eviluniswap.org", ["uniswap.org"])).toBe(
      false,
    );
    expect(
      domainMatches("https://uniswap.org.evil.test", ["uniswap.org"]),
    ).toBe(false);
    expect(domainMatches("not a url", ["uniswap.org"])).toBe(false);
    expect(domainMatches("http://localhost:5173", ["*"])).toBe(true);
  });
});
