import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("listItemOnAuction", "List an item on auction")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID")
  .addParam("min", "Minimal price")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id, min } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const contract: Marketplace = await Contract.attach(marketplace);

    const tx = await contract.listItemOnAuction(id, min);
    await tx.wait();
  });
