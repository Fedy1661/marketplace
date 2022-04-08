import { task, types } from "hardhat/config";
import { Marketplace } from "../typechain";

task("listItem", "List an item")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID", undefined, types.int)
  .addParam("price", "Price", undefined, types.string)
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id, price } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.listItem(id, price);
    await tx.wait();
  });
