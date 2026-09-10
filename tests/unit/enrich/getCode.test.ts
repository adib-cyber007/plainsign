import { describe, expect, it, vi } from "vitest";

import { getCode } from "../../../src/enrich/getCode";

describe("getCode", () => {
  it("uses the client for the request chain and address", async () => {
    const address = "0x1111111111111111111111111111111111111111" as const;
    const client = { getCode: vi.fn().mockResolvedValue("0x6000") };
    const factory = vi.fn(() => client);

    await expect(getCode(address, 31337, factory)).resolves.toBe("0x6000");
    expect(factory).toHaveBeenCalledWith(31337);
    expect(client.getCode).toHaveBeenCalledWith({ address });
  });
});
