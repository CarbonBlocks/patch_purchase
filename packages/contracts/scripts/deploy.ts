import fs from "fs";
import path from "path";
import chalk from "chalk";
import { config, ethers, tenderly, run, upgrades, network } from "hardhat";
import { utils, Contract } from "ethers";
import R from "ramda";
import { hrtime } from "process";
// import { Maybe } from '../../ui/lib/types'

const name = "PatchBuyer";

const DEBUG = false;
const debug = (...info: Array<unknown>) => {
  if (DEBUG) console.debug(...info);
};

const chain = process.env.HARDHAT_NETWORK ?? config.defaultNetwork;

const main = async () => {
  console.log(`\n\n 📡 Deploying: ${name}…\n`);

  const token = await deploy(name);
  await token.deployTransaction.wait(6);

  //const yourContract = await ethers.getContractAt('YourContract', '0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A') //<-- if you want to instantiate a version of a contract at a specific address!
  //If you want to verify your contract on tenderly.co (see setup details in the scaffold-eth README!)
  /*
  await tenderlyVerify(
    {contractName: 'YourContract',
     contractAddress: yourContract.address
  })
  */

  const implementationAddress = token.address;

  // const verification = await tenderlyVerify({
  //   contract: name,
  //   address: implementationAddress,
  // });

  try {
    console.log(
      chalk.hex("#FFD25E")(
        `\n 🔍 Verifying ${chalk.hex("#8454FF")(implementationAddress)}` +
          ` on ${
            ["polygon", "mumbai"].includes(chain) ? "Polygon" : "Ether"
          }scan…\n`
      )
    );
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
  } catch (err) {
    console.error((err as Error).message);
  }

  let saveDir = config.paths.artifacts;
  if (process.env.PWD && saveDir.startsWith(process.env.PWD)) {
    saveDir = saveDir.substring(process.env.PWD.length + 1);
  }
  console.log(
    "\n 💾  Artifacts (address, abi, and args) saved to:" +
      ` ${chalk.hex("#87FF37")(saveDir)}\n\n`
  );
};

const fileTemplates = {
  address: `artifacts/${network.name}/{contract}.address`,
  args: `artifacts/${network.name}/{contract}.args`,
};

const deploy = async (
  contract: string,
  _args = [],
  overrides = {},
  libraries = {}
) => {
  const files = Object.fromEntries(
    Object.entries(fileTemplates).map(([name, template]) => {
      template = template.replace(/\{contract\}/g, contract);
      const dir = path.dirname(template);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return [name, template];
    })
  );

  console.log(`\n 🛰  Deploying: ${contract}`);

  if (!ethers) throw new Error("`ethers` is not defined.");

  const args = _args ?? [];
  const artifacts = await ethers.getContractFactory(contract, { libraries });

  let impl: { new?: string; old?: string } = {};

  // if (!fs.existsSync(files.address)) {
  console.log(
    `\n 🥂 ${chalk.hex("#FF7D31")(files.address)} doesn't exist;` +
      " creating a new token…"
  );
  const factory = await ethers.getContractFactory(name);
  const tx = await factory.deploy();
  const deployed = await tx.deployed();

  const {
    address: token,
    signer: signator,
    deployTransaction: { gasPrice: gas, hash: txHash, chainId: chain },
  } = deployed;
  const signer = await signator.getAddress();
  const gasPrice = gas ?? "Undefined";

  console.debug(
    ` 🍅 ${chalk.hex("#00AA7F")("Deployed in TX:")} ` +
      chalk.hex("#6572AA")(txHash)
  );
  let loops = 0;
  const timeout = 4 * 1000;
  const maxLoops = 25;
  let done = false;

  console.log(
    `\n 📄 ${chalk.cyan(contract)},` +
      ` deployed as a token at ${chalk.magenta(token)}` +
      ` to the implementation at ${chalk.hex("#DE307E")(impl.new)}` +
      ` by ${chalk.hex("#5A5FA5")(signer)}` +
      ` on chain ${chalk.bold.yellowBright(`#${chain}`)}` +
      ` ${chalk.green(`(saved to ${files.address})`)}.`
  );
  fs.writeFileSync(files.address, token);

  let gasInfo = "𐌵ⲛⲕⲛⲟⲱⲛ";
  if (typeof gasPrice === "number") {
    const gasUsed = deployed.deployTransaction.gasLimit.mul(gasPrice);
    gasInfo =
      `${utils.formatEther(gasUsed)} ` +
      (network.name === "polygon" ? "MATIC" : "ETH");
  }

  console.log(`\n ⛽ ${chalk.hex("#C6A831")(gasInfo)}`);

  const encoded = abiEncodeArgs(deployed, args);

  if (encoded && encoded.length > 2) {
    console.log(
      `\n 📚 Serializing ${encoded.length}` +
        ` arguments to ${chalk.hex("#6FBCFF")(files.args)}.`
    );
    fs.writeFileSync(files.args, encoded.slice(2));
  }

  return deployed;
};

// ------ utils -------

// abi encodes contract arguments
// useful when you want to manually verify the contracts
// for example, on Etherscan
const abiEncodeArgs = (deployed: Contract, args: Array<unknown>) => {
  if (args && deployed && R.hasPath(["interface", "deploy"], deployed)) {
    return utils.defaultAbiCoder.encode(deployed.interface.deploy.inputs, args);
  }
};

// checks if it is a Solidity file
const isSolidity = (filename: string) => /\.(sol|swp|swap)$/i.test(filename);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

main()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((error) => {
    console.error({ error });
    process.exit(-1);
  });
