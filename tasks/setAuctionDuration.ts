import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("setAuctionDuration", "Set auction duration")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("duration", "Auction duration(seconds)")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, duration } = taskArgs;
    const contract: Marketplace = await hre.ethers.getContractAt(
      "Marketplace",
      marketplace
    );

    const tx = await contract.setAuctionDuration(duration);
    await tx.wait();
  });
