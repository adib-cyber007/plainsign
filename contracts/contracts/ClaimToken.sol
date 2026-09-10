// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ClaimToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 ether;

    event Claimed(address indexed claimant);

    constructor() ERC20("Claim Token", "CLAIM") {}

    function faucet(address to) external {
        _mint(to, FAUCET_AMOUNT);
    }

    function claim() external {
        emit Claimed(msg.sender);
    }
}
