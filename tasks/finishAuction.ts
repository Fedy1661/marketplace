import { task } from "hardhat/config";
import { Marketplace } from "../typechain";

task("finishAuction", "Finish auction")
  .addParam("marketplace", "Marketplace contract address")
  .addParam("id", "Token ID")
  .setAction(async (taskArgs, hre) => {
    const { marketplace, id } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const contract: Marketplace = await Contract.attach(marketplace);

    const tx = await contract.finishAuction(id);
    await tx.wait();
  });
