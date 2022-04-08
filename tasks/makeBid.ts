import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("makeBid", "Make a bid")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID")
  .addParam("price", "Price")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id, price } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.listItem(id, price);
    await tx.wait();
  });
