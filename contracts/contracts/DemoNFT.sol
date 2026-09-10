// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DemoNFT is ERC721 {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;

    constructor() ERC721("Demo Cats", "DCAT") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory tokenNumber = tokenId.toString();
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">',
                '<rect width="320" height="320" fill="#6c3bff"/>',
                '<path d="M70 118 92 54l56 42h24l56-42 22 64v82c0 62-40 92-90 92s-90-30-90-92z" fill="#fff9ed" stroke="#101014" stroke-width="12"/>',
                '<circle cx="126" cy="166" r="11" fill="#101014"/><circle cx="194" cy="166" r="11" fill="#101014"/>',
                '<path d="m148 196 12 10 12-10M160 206v18" fill="none" stroke="#101014" stroke-width="8" stroke-linecap="round"/>',
                '<text x="160" y="38" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#fff9ed">DEMO CAT #',
                tokenNumber,
                '</text></svg>'
            )
        );
        string memory metadata = string(
            abi.encodePacked(
                '{"name":"Demo Cat #',
                tokenNumber,
                '","description":"A local-only PlainSign demo collectible.","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '"}'
            )
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }
}
