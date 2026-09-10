import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("PlainSign local demo contracts", function () {
  it("mints Demo Cats with an inline SVG data URI", async function () {
    const [, recipient] = await hre.viem.getWalletClients();
    const nft = await hre.viem.deployContract("DemoNFT");
    await nft.write.mint([recipient.account.address]);

    expect(await nft.read.name()).to.equal("Demo Cats");
    expect(await nft.read.symbol()).to.equal("DCAT");
    expect(String(await nft.read.ownerOf([1n])).toLowerCase()).to.equal(
      recipient.account.address.toLowerCase(),
    );
    expect(await nft.read.tokenURI([1n])).to.match(/^data:application\/json;base64,/);
  });

  it("faucets 1000 CLAIM while claim remains a harmless decoy", async function () {
    const [, recipient] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("ClaimToken");
    await token.write.faucet([recipient.account.address]);
    const before = await token.read.balanceOf([recipient.account.address]);

    await token.write.claim([], { account: recipient.account });

    expect(before).to.equal(parseEther("1000"));
    expect(await token.read.balanceOf([recipient.account.address])).to.equal(before);
  });

  it("accepts a payable FakeMint call without minting an asset", async function () {
    const publicClient = await hre.viem.getPublicClient();
    const fakeMint = await hre.viem.deployContract("FakeMint");
    const value = parseEther("0.02");
    const hash = await fakeMint.write.mint([], { value });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    expect(receipt.status).to.equal("success");
    expect(await publicClient.getBalance({ address: fakeMint.address })).to.equal(value);
    expect(receipt.logs).to.have.length(1);
  });

  it("wraps and unwraps ETH with the standard WETH9 interface", async function () {
    const publicClient = await hre.viem.getPublicClient();
    const [owner] = await hre.viem.getWalletClients();
    const weth = await hre.viem.deployContract("WETH9");
    const deposited = parseEther("1");
    const withdrawn = parseEther("0.4");

    await weth.write.deposit([], { value: deposited });
    expect(await weth.read.balanceOf([owner.account.address])).to.equal(deposited);
    expect(await weth.read.totalSupply()).to.equal(deposited);

    await weth.write.withdraw([withdrawn]);
    expect(await weth.read.balanceOf([owner.account.address])).to.equal(deposited - withdrawn);
    expect(await publicClient.getBalance({ address: weth.address })).to.equal(deposited - withdrawn);
  });
});
