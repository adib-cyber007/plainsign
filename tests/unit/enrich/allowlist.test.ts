import { describe, expect, it } from "vitest";

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
      getAllowlistEntry(31337, "0xC02AAa39b223FE8D0A0E5C4F27eAD9083C756Cc2"),
    ).toBeUndefined();
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
