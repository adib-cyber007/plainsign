import { enrich } from ".";
import { getAllowlistedAddresses } from "./allowlist";

const SEPOLIA_CHAIN_ID = 11_155_111;

export interface WarmupDeps {
  enrich?: typeof enrich;
  getAllowlistedAddresses?: typeof getAllowlistedAddresses;
}

export async function warmAllowlistedAddresses(
  deps: WarmupDeps = {},
): Promise<void> {
  const addresses = (deps.getAllowlistedAddresses ?? getAllowlistedAddresses)(
    SEPOLIA_CHAIN_ID,
  );
  if (addresses.length === 0) return;
  try {
    await (deps.enrich ?? enrich)(
      addresses,
      SEPOLIA_CHAIN_ID,
      "chrome-extension://plainsign-warmup",
    );
  } catch {
    // Warm-up is opportunistic; normal enrichment still runs on demand.
  }
}
