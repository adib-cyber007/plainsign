import { describe, expect, it, vi } from "vitest";

import {
  COMMUNITY_DENYLIST_URL,
  findCommunityDenylistEntry,
  getCommunityDenylist,
} from "../../../src/enrich/denylist";

const address = "0x2222222222222222222222222222222222222222" as const;

function document(allow: string[] = []) {
  return {
    version: 1,
    updatedAt: "2026-09-12",
    allow,
    deny: [
      {
        address,
        label: "Reported drainer",
        chains: [1],
        source: "Community report #1",
      },
    ],
  };
}

describe("community denylist", () => {
  it("fetches, validates, and matches a remote entry by address and chain", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(document()), { status: 200 }),
    );
    const entries = await getCommunityDenylist({ fetcher });

    expect(fetcher).toHaveBeenCalledWith(
      COMMUNITY_DENYLIST_URL,
      { headers: { accept: "application/json" } },
      1_500,
    );
    expect(
      findCommunityDenylistEntry(entries, address.toUpperCase(), 1),
    ).toMatchObject({
      label: "Reported drainer",
    });
    expect(
      findCommunityDenylistEntry(entries, address, 11155111),
    ).toBeUndefined();
  });

  it("lets a reviewed allow entry override a deny entry", async () => {
    const entries = await getCommunityDenylist({
      fetcher: async () =>
        new Response(JSON.stringify(document([address])), { status: 200 }),
    });
    expect(entries).toEqual([]);
  });

  it("falls back to the bundled demo attacker when remote JSON is invalid", async () => {
    const entries = await getCommunityDenylist({
      fetcher: async () => new Response("{}", { status: 200 }),
    });
    expect(
      findCommunityDenylistEntry(
        entries,
        "0x3B497AE93753967D3eA96cf04a517C3da0e66003",
        11155111,
      ),
    ).toMatchObject({ label: "PlainSign demo attacker" });
  });
});
