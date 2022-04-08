import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("setMinBids", "Set minimal bids")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("bids", "Bids")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, bids } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const contract: Marketplace = await Contract.attach(marketplace);

    const tx = await contract.setMinBids(bids);
    await tx.wait();
  });
