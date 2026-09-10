// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract FakeMint {
    event MintAttempt(address indexed caller, uint256 value);

    function mint() external payable {
        emit MintAttempt(msg.sender, msg.value);
    }
}
