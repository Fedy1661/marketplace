import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("cancel", "Unlist item")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.cancel(id);
    await tx.wait();
  });
