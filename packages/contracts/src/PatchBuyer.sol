// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { GenericLargeResponse } from "./PatchPurchaseChainlink.sol";
import { PriceConsumerV3 } from "./MATICUSDMumbaiPrice.sol";



contract PatchBuyer is PriceConsumerV3, GenericLargeResponse {
    uint public cost;
    string public price;

    function buy(string memory projectId) public payable returns(bool) {
        require(
            msg.value > 0,
            'Please send value to the transaction'
        );
        
        //added 10**9 on msg.value to use gwei
        cost = ((msg.value*10**2)*10**9) * uint((getLatestPrice() * 10**10))/10**36;

        //subtract fees patch and carbonblocks
        //price = Strings.toString(cost  - 2);

        requestMultiVariable(cost, projectId);
        return true;
    }
}
