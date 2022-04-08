import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const Contract = await ethers.getContractFactory("Marketplace");
  const contract = await Contract.deploy(process.env.ERC20 as string);

  await contract.deployed();

  console.log("Marketplace deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
