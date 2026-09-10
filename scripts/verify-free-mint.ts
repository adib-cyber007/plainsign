import { encodeFunctionData, type Address } from "viem";

import { analyze } from "../src/analyze";
import { serialize } from "../src/bridge/protocol";
import { erc721Abi } from "../src/decoder/abis/erc721";
import type { AnalysisRequest } from "../src/types";

const victim = "0x1111111111111111111111111111111111111111" as Address;
const demoNft = "0xcccccccccccccccccccccccccccccccccccccccc" as Address;
const attacker = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;

const request: AnalysisRequest = {
  id: "free-mint-reasoning-check",
  origin: "http://localhost:5173",
  chainId: 31337,
  from: victim,
  request: {
    method: "eth_sendTransaction",
    params: [
      {
        from: victim,
        to: demoNft,
        data: encodeFunctionData({
          abi: erc721Abi,
          functionName: "setApprovalForAll",
          args: [attacker, true],
        }),
      },
    ],
  },
};

const result = await analyze(request, {
  enrich: async (addresses) =>
    Object.fromEntries(
      addresses.map((address) => [
        address.toLowerCase(),
        {
          address,
          isContract: address.toLowerCase() !== attacker.toLowerCase(),
          fetchedAt: Date.now(),
        },
      ]),
    ),
  debug: () => undefined,
});

console.log(JSON.stringify(serialize(result), null, 2));

const reasonIds = result.risk.reasons.map((reason) => reason.id);
if (
  result.risk.verdict !== "danger" ||
  !reasonIds.includes("spender_is_eoa") ||
  !reasonIds.includes("approval_for_all")
) {
  throw new Error(
    "Free Mint reasoning check did not produce the required danger reasons.",
  );
}
