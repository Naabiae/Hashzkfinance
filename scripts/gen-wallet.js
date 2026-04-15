import fs from "fs";
import hre from "hardhat";

async function main() {
  const wallet = hre.ethers.Wallet.createRandom();
  fs.appendFileSync(".env", `PRIVATE_KEY=${wallet.privateKey}\n`);
  console.log(wallet.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

