//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

contract ProjectFT is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol){
  }
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

}

contract PatchBridge is ChainlinkClient{
  using Chainlink for Chainlink.Request;

  mapping (uint256 => ProjectFT) public tokens;
  mapping (bytes32 => address) public initiator;
  uint256 public count;

  constructor(
    address chainlinkToken,
    address chainlinkOracle
  ) {
    setChainlinkToken(chainlinkToken);
    setChainlinkOracle(chainlinkOracle);

    // setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
    // setChainlinkOracle(0xedaa6962Cf1368a92e244DdC11aaC49c0A0acC37);
  }

  function generateFT(string calldata project, string calldata symbol) public{
    uint256 projectId = uint(keccak256(bytes(project)));
    ProjectFT token = tokens[projectId];
    if (address(token) == address(0)){
      token = tokens[projectId] = new ProjectFT(
        project, symbol
      );
    }
    
  }
  
  event PreparingPurchase(uint price, string patchProjectId);

  function executeBuy(uint256 priceInPenny, string memory patchProjectId) public
  {
    bytes32 jobId = "4ed6d383b8a64b9fb4453b1819f80ff1";
    
    string memory price = Strings.toString(priceInPenny);
    emit PreparingPurchase(priceInPenny, patchProjectId);
    uint256 payment = 0;
    Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillBytes.selector);
    req.add("get", string(abi.encodePacked(
      "https://patchpurchase.netlify.app/api/buy?price=", price, "&patchProjectId=", patchProjectId
    )));
    req.add("path1", "data,token_uri");
    req.add("path2", "data,mass_g");
    req.add("path3", "data,project");
    bytes32 requestId = sendChainlinkRequest(req, payment);
    initiator[requestId] = msg.sender;
    count++;
  }


  event PurchaseFulfilled(
    bytes32 indexed requestId,
    string indexed tokenURI,
    uint256 mass_g,
    string indexed project
  );


function fulfillBytes(
    bytes32 requestId,
    string calldata tokenURI,
    uint256 mass_g,
    string calldata project
  )
    public
    recordChainlinkFulfillment(requestId)
  {
    emit PurchaseFulfilled(requestId, tokenURI, mass_g, project);
    uint256 projectId = uint(keccak256(bytes(project)));
    ProjectFT token = tokens[projectId];
    token.mint(initiator[requestId], (mass_g * 10**12));
  }
  
  function balanceOf(address owner, string calldata project) public view returns(uint256 balance) {
    return balanceOf(owner, uint256(keccak256(bytes(project))));
  }

  function balanceOf(address owner, uint256 projectId) public view returns(uint256 balance) {
    ProjectFT token = tokens[projectId];
    require(address(token) != address(0), 'projectId not found');
    return token.balanceOf(owner);
  }
}