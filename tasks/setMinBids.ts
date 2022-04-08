import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("setMinBids", "Set minimal bids")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("bids", "Bids")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, bids } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.setMinBids(bids);
    await tx.wait();
  });
