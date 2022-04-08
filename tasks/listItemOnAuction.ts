import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("listItemOnAuction", "List an item on auction")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID")
  .addParam("min", "Minimal price")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id, min } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.listItemOnAuction(id, min);
    await tx.wait();
  });
