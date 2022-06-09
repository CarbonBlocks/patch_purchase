//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@layerzerolabs/solidity-examples/contracts/token/oft/OFT.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

contract ProjectOFT is OFT {
  constructor(string memory name, string memory symbol, address lzEndpoint) OFT(name, symbol, lzEndpoint){
  }
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

}

contract PatchBridge is ChainlinkClient{
  using Chainlink for Chainlink.Request;

  mapping (uint256 => ProjectOFT) public tokens;
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

  function generateOFT(string calldata project, string calldata symbol) public{
    uint256 projectId = uint(keccak256(bytes(project)));
    ProjectOFT token = tokens[projectId];
    if (address(token) == address(0)){
      token = tokens[projectId] = new ProjectOFT(
        project, symbol, 0xf69186dfBa60DdB133E91E9A4B5673624293d8F8
      );
    }
    
  }

  function executeBuy(uint256 priceInPenny, string memory patchProjectId) public
  {
    bytes32 jobId = "1e4915771e4d4985a72de8d9507b2023";
    
    string memory price = Strings.toString(priceInPenny);

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
    bytes indexed tokenURI,
    uint256 mass_g,
    string indexed project
  );


  function fulfillBytes(
    bytes32 requestId,
    bytes memory tokenURI,
    int256 mass_g,
    string calldata project
  )
    public
    recordChainlinkFulfillment(requestId)
  {
    emit PurchaseFulfilled(requestId, tokenURI, uint(mass_g), project);
    uint256 projectId = uint(keccak256(bytes(project)));
    ProjectOFT token = tokens[projectId];
    token.mint(initiator[requestId], uint(mass_g));
  }
  
  function balanceOf(address owner, string calldata project) public view returns(uint256 balance) {
    return balanceOf(owner, uint256(keccak256(bytes(project))));
  }

  function balanceOf(address owner, uint256 projectId) public view returns(uint256 balance) {
    ProjectOFT token = tokens[projectId];
    require(address(token) != address(0), 'projectId not found');
    return token.balanceOf(owner);
  }
}


// pragma solidity ^0.8.7;

// import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

// contract GenericLargeResponse is ChainlinkClient {
//   using Chainlink for Chainlink.Request;


//   bytes public data;
//   string public token_uri;
//   int256 public mass_g;
//   string public project;
  
//   constructor(
//   ) {
//     setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
//     setChainlinkOracle(0xedaa6962Cf1368a92e244DdC11aaC49c0A0acC37);
//   }


//   function executeBuy(
//   )
//     public
//   {
//     bytes32 specId = "1e4915771e4d4985a72de8d9507b2023";
//     uint256 payment = 0;
//     Chainlink.Request memory req = buildChainlinkRequest(specId, address(this), this.fulfillBytes.selector);
//     req.add("get", "https://patchpurchase.netlify.app/api/buy?price=82&patchProjectId=pro_test_9fdc93f66dba9cdfacbceac9f2648a01");
//     req.add("path1", "data,token_uri");
//     req.add("path2", "data,mass_g");
//     req.add("path3", "data,project");
//     sendOperatorRequest(req, payment);
//   }

//   event RequestFulfilled(
//     bytes32 indexed requestId,
//     bytes indexed data,
//     int256 mass_g,
//     string indexed project
//   );


//   function fulfillBytes(
//     bytes32 requestId,
//     bytes memory bytesData,
//     int256 _mass_g,
//     string calldata _project
//   )
//     public
//     recordChainlinkFulfillment(requestId)
//   {
//     emit RequestFulfilled(requestId, bytesData, _mass_g, _project);
//     data = bytesData;
//     token_uri = string(data);
//     mass_g = _mass_g;
//     project = _project;
//   }

// }