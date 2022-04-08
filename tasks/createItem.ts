import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("createItem", "Create an item")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("uri", "Token URI")
  .addParam("owner", "Owner address")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, uri, owner } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const contract: Marketplace = await Contract.attach(marketplace);

    const tx = await contract.createItem(uri, owner);
    await tx.wait();
  });
