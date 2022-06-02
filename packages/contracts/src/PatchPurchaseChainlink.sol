//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@layerzerolabs/solidity-examples/contracts/token/oft/OFT.sol";

contract ProjectOFT is OFT {
  constructor(string memory name, string memory symbol, address lzEndpoint) OFT(name, symbol, lzEndpoint){
  }
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

}

contract GenericLargeResponse is ChainlinkClient {
  using Chainlink for Chainlink.Request;

  mapping (uint256 => ProjectOFT) public tokens;

  bytes public data;
  string public token_uri;
  uint256 public mass_g;
  // string public projectId = "44";

  constructor(
  ) {
    setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
    setChainlinkOracle(0xedaa6962Cf1368a92e244DdC11aaC49c0A0acC37);
  }


  function requestMultiVariable(uint256 priceCost, string memory projectId) public
  {
    bytes32 specId = "e2112f96866a4cf293df5d16b0cbf7fd";
    
    string memory price = Strings.toString(priceCost);

    uint256 payment = 0;
    Chainlink.Request memory req = buildChainlinkRequest(specId, address(this), this.fulfillBytes.selector);
    req.add("get", string(abi.encodePacked(
      "https://patchpurchase.netlify.app/api/buy?price=", price, "&projectId=", projectId
    )));
    //req.add("get", "https://patchpurchase.netlify.app/api/buy?price=82");
    req.add("path1", "data,token_uri");
    req.add("path2", "data,mass_g");
    req.add("path3", "data,project");
    sendOperatorRequest(req, payment);
  }

  event RequestFulfilled(
    bytes32 indexed requestId,
    bytes indexed data,
    uint256 mass_g,
    string project
  );


  function fulfillBytes(
    bytes32 requestId,
    bytes memory bytesData,
    uint256 _mass_g,
    string calldata project
  )
    public
    recordChainlinkFulfillment(requestId)
  {
    uint256 projectId = uint(keccak256(bytes(project)));
    ProjectOFT token = tokens[projectId];
    if (address(token) == address(0)){
      token = tokens[projectId] = new ProjectOFT(project, "ABC", 0xf69186dfBa60DdB133E91E9A4B5673624293d8F8);
    }
    token.mint(msg.sender, _mass_g);
    emit RequestFulfilled(requestId, bytesData, _mass_g, project);
    data = bytesData;
    token_uri = string(data);
    mass_g = _mass_g;
  }
}