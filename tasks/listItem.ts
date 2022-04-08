import { task, types } from "hardhat/config";
import { Marketplace } from "../typechain";

task("listItem", "List an item")
  .addParam(
    "marketplace",
    "Marketplace contract address",
    undefined,
    types.string
  )
  .addParam("id", "Token ID", undefined, types.int)
  .addParam("price", "Price", undefined, types.string)
  .setAction(async (taskArgs, hre) => {
    const { marketplace: contractAddress, id, price } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Marketplace");
    const marketplace: Marketplace = await Contract.attach(contractAddress);

    const tx = await marketplace.listItem(id, price);
    await tx.wait();
  });
