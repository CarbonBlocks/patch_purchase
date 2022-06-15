// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { PatchBridge } from "./PatchPurchaseChainlink.sol";
import { PriceConsumerV3 } from "./MATICUSDMumbaiPrice.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

library SharedVariables {
    ERC20 public constant USDC = ERC20(0xDbc4c91BE4722e54672bCCCB5EAD82C9Bcf356f6);
}

contract PatchBuyer is PriceConsumerV3, PatchBridge {
    // ERC20 public USDC;


    constructor(
        address chainlinkToken,
        address chainlinkOracle
    ) PatchBridge(chainlinkToken, chainlinkOracle){
        //USDC = ERC20(0xDbc4c91BE4722e54672bCCCB5EAD82C9Bcf356f6);
    }

    function buy(string memory patchProjectId, uint256 priceInPenny) public returns(bool) {
        //uint256 priceInPenny = USDC.balanceOf(address(this));
        require(
            priceInPenny > 0,
            'Please send value to the transaction'
        );
        //added 10**9 on msg.value to use gwei
        //priceInPenny = (msg.value * uint(getLatestPrice()) * 10**12) / 10**36;
        require(
            SharedVariables.USDC.transferFrom(msg.sender, address(this), priceInPenny*10**4),
            'ERC-20 transfer did not succeed'
        );
            

        //subtract fees patch and carbonblocks
        //price = Strings.toString(cost  - 2);

        executeBuy(priceInPenny, patchProjectId);
        // executeBuy();
        return true;
    }
}

