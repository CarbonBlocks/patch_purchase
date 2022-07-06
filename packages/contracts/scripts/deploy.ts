import fs from "fs";
import path from "path";
import chalk from "chalk";
import { config, ethers, run, upgrades, network } from "hardhat";
import { utils, Contract, BigNumber } from "ethers";
import R from "ramda";
import { hrtime } from "process";
// import { Maybe } from '../../ui/lib/types'
import { chainlinkConfig } from "../consts";

const name = "PatchBridge";

const DEBUG = false;
const debug = (...info: Array<unknown>) => {
  if (DEBUG) console.debug(...info);
};
let impl: { new?: string; old?: string } = {};

const chain = process.env.HARDHAT_NETWORK ?? config.defaultNetwork;

const main = async () => {
  console.log(`\n\n 📡 Deploying: ${name}…\n`);

  const args: Array<string> = []; //[chainlinkConfig.mumbai.token, chainlinkConfig.mumbai.oracle];
  const token = await deploy(name, args);
  await token.deployTransaction.wait(6);

  const implementationAddress = impl.new;

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
      constructorArguments: args,
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
  _args: Array<string> = [],
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
  let tx;
  const factory = await ethers.getContractFactory(name);
  if (!fs.existsSync(files.address)) {
    console.log(
      `\n 🥂 ${chalk.hex("#FF7D31")(files.address)} doesn't exist;` +
        " creating a new token…"
    );
    tx = await upgrades.deployProxy(factory, args, {
      kind: "uups",
      timeout: 10 * 60 * 1000,
    });
  } else {
    const existing = fs.readFileSync(files.address).toString().trim();
    impl.old = await upgrades.erc1967.getImplementationAddress(existing);

    console.log(
      `\n ⚇ Existing deployment proxied at ${chalk.hex("#AD4EFF")(existing)}` +
        ` for implementation ${chalk.hex("#87BED5")(impl.old)};` +
        " upgrading"
    );
    tx = await upgrades.upgradeProxy(existing, artifacts, {
      kind: "uups",
      timeout: 10 * 60 * 1000,
    });
  }
  // const tx = await factory.deploy(...args);

  // (chainlinkConfig[chain as keyof typeof chain] as {token: string}).token,
  // chainlinkConfig[chain].oracle
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

  while (!done && ++loops <= maxLoops) {
    try {
      impl.new = await upgrades.erc1967.getImplementationAddress(token);
    } catch (err) {} // fails if the proxy isn't yet connected
    done = impl.new != null && impl.old !== impl.new;
    if (!done) {
      console.info(
        ` ${chalk.hex("#FF0606")(loops.toString())}:` +
          " No new implmentation found at" +
          ` ${chalk.hex("#FFF013")(token)};` +
          ` sleeping ${timeout / 1000}s`
      );
      await sleep(timeout);
    }
  }

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
  if (typeof gasPrice === "number" || gasPrice instanceof BigNumber) {
    const gasUsed = deployed.deployTransaction.gasLimit.mul(gasPrice);
    gasInfo =
      `${utils.formatEther(gasUsed)} ` +
      (["polygon", "mumbai"].includes(network.name) ? "MATIC" : "ETH");
  }
  console.log(`\n ⛽ gas = ${chalk.hex("#C6A831")(gasInfo)}`);

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
  // console.log(deployed.interface.deploy.inputs);
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
