import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("setAuctionDuration", "Set auction duration")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("duration", "Auction duration(seconds)")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, duration } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const contract: Marketplace = await Contract.attach(marketplace);

    const tx = await contract.setAuctionDuration(duration);
    await tx.wait();
  });
