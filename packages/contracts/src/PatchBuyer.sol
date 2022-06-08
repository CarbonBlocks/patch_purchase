// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { GenericLargeResponse } from "./PatchPurchaseChainlink.sol";
import { PriceConsumerV3 } from "./MATICUSDMumbaiPrice.sol";



contract PatchBuyer is PriceConsumerV3, GenericLargeResponse {
    uint public priceInPenny;

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
        return true;
    }
}
