// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { PatchBridge } from "./PatchPurchaseChainlink.sol";
import { PriceConsumerV3 } from "./MATICUSDMumbaiPrice.sol";



contract PatchBuyer is PriceConsumerV3, PatchBridge {
    uint public priceInPenny;

    constructor(
        address chainlinkToken,
        address chainlinkOracle
    ) PatchBridge(chainlinkToken, chainlinkOracle){}

    function buy(string memory patchProjectId) public payable returns(bool) {
        require(
            msg.value > 0,
            'Please send value to the transaction'
        );
        
        //added 10**9 on msg.value to use gwei
        priceInPenny = (msg.value * uint(getLatestPrice()) * 10**12) / 10**36;

        //subtract fees patch and carbonblocks
        //price = Strings.toString(cost  - 2);

        executeBuy(priceInPenny, patchProjectId);
        // executeBuy();
        return true;
    }
}
