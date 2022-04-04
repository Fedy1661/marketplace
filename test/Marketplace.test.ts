import { ethers, network } from "hardhat";
import chai, { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Marketplace } from "../typechain";

chai.use(require("chai-bignumber")());

describe("Staking Contract", function () {
  let marketplace: Marketplace;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let clean: string;

  const DURATION = 60 * 60 * 24 * 3;

  before(async () => {
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    [owner, addr1] = await ethers.getSigners();

    clean = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });

  describe("createItem", () => {
    it("should throw error when call by user", async () => {
      const tx = marketplace.connect(addr1).createItem();
      const reason = "Ownable: caller is not the owner";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should call by owner", async () => {
      const tx = marketplace.createItem();
      const reason = "Ownable: caller is not the owner";
      await expect(tx).not.to.be.revertedWith(reason);
    });
    it("should be correct owner", async () => {
      await marketplace.createItem();
      const ownerNFTAddress = await marketplace.ownerOf(0);
      expect(ownerNFTAddress).to.be.equal(marketplace.address);
    });
  });
  describe("listItem", () => {
    it("should throw error when call by user", async () => {
      await marketplace.createItem();
      const tx = marketplace.connect(addr1).listItem(0, 10);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should call by owner", async () => {
      await marketplace.createItem();
      const tx = marketplace.listItem(0, 10);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).not.to.be.revertedWith(reason);
    });
    it("should throw error if price equals zero", async () => {
      await marketplace.createItem();

      const tx = marketplace.listItem(0, 0);
      const reason = "Price should be positive";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item is selling", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);

      const tx = marketplace.listItem(0, 10);
      const reason = "Item is selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item doesn't exist", async () => {
      const tx = marketplace.listItem(0, 10);
      const reason = "ERC721: owner query for nonexistent token";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if list item after auction", async () => {
      await marketplace.createItem();
      await marketplace.listItemOnAuction(0);

      await marketplace.makeBid(0, { value: 100 });

      await network.provider.send("evm_increaseTime", [DURATION]);
      await network.provider.send("evm_mine");

      await marketplace.finishAuction(0);

      const tx = marketplace.listItem(0, 10);
      const reason = "Token was sold";
      await expect(tx).to.be.revertedWith(reason);
    });
  });

  describe("buyItem", () => {
    it("should throw error when buying sold item", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      await marketplace.connect(addr1).buyItem(0, { value: 10 });

      const tx = marketplace.buyItem(0, { value: 10 });
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error when item is not selling", async () => {
      await marketplace.createItem();

      const tx = marketplace.connect(addr1).buyItem(0, { value: 10 });
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item doesn't exist", async () => {
      const tx = marketplace.buyItem(0);
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if value lower than price", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);

      const tx = marketplace.connect(addr1).buyItem(0, { value: 9 });
      const reason = "Not enough";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("buyer should get NFT", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      await marketplace.connect(addr1).buyItem(0, { value: 10 });

      const NFTOwner = await marketplace.ownerOf(0);
      expect(NFTOwner).to.be.equal(addr1.address);
    });
  });
  describe("cancel", () => {
    it("should be error when buying item after cancel", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      await marketplace.cancel(0);

      const tx = marketplace.connect(addr1).buyItem(0, { value: 10 });
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item doesn't exist", async () => {
      const tx = marketplace.cancel(0);
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error when call by user", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      const tx = marketplace.connect(addr1).cancel(0);

      const reason = "Ownable: caller is not the owner";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should call by owner", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);

      const tx = marketplace.cancel(0);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).not.to.be.revertedWith(reason);
    });
  });

  describe("Auction", () => {
    describe("listItemOnAuction", () => {
      it("should throw error if item doesn't exist", async () => {
        const tx = marketplace.listItemOnAuction(0);
        const reason = "ERC721: owner query for nonexistent token";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if item was sold", async () => {
        await marketplace.createItem();
        await marketplace.listItem(0, 10);
        await marketplace.connect(addr1).buyItem(0, { value: 10 });

        const tx = marketplace.listItemOnAuction(0);
        const reason = "Token was sold";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if auction is active", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        const tx = marketplace.listItemOnAuction(0);
        const reason = "Auction is active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if list item after sell", async () => {
        await marketplace.createItem();
        await marketplace.listItem(0, 10);
        await marketplace.buyItem(0, { value: 10 });

        const tx = marketplace.listItemOnAuction(0);
        const reason = "Token was sold";
        await expect(tx).to.be.revertedWith(reason);
      });
    });
    describe("makeBid", () => {
      it("should throw error if value equals 0", async () => {
        await marketplace.createItem();
        const tx = marketplace.makeBid(0, { value: 0 });
        const reason = "Value should be positive";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if item doesn't exist", async () => {
        const tx = marketplace.makeBid(0, { value: 10 });
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if item is not at auction", async () => {
        await marketplace.createItem();

        const tx = marketplace.makeBid(0, { value: 10 });
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if auction was ended", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.makeBid(0, { value: 100 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const tx = marketplace.makeBid(0, { value: 10 });
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if auction was canceled", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.makeBid(0, { value: 100 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.cancelAuction(0);

        const tx = marketplace.makeBid(0, { value: 10 });
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
    });
    describe("finishAuction", () => {
      it("should throw error if item was sold", async () => {
        await marketplace.createItem();
        await marketplace.listItem(0, 10);
      });
      it("should throw error if auction was stopped", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await network.provider.send("evm_increaseTime", [DURATION + 1]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);
        const tx = marketplace.finishAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if call function earlier than 3 days", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        const tx = marketplace.finishAuction(0);
        const reason = "Auction is still active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if auction didn't start", async () => {
        await marketplace.createItem();
        const tx = marketplace.finishAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if item doesn't exist", async () => {
        const tx = marketplace.finishAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should transfer item to the alone bidder", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.makeBid(0, { value: 100 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const tx = await marketplace.ownerOf(0);
        expect(tx).to.be.equal(owner.address);
      });
      it("bids should be summed up", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.makeBid(0, { value: 100 });
        await marketplace.makeBid(0, { value: 100 });
        await marketplace.connect(addr1).makeBid(0, { value: 150 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const ownerAddress = await marketplace.ownerOf(0);
        expect(ownerAddress).to.be.equal(owner.address);
      });
      it("the winner should be the first of the same bets", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.connect(addr1).makeBid(0, { value: 100 });
        await marketplace.makeBid(0, { value: 100 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const ownerAddress = await marketplace.ownerOf(0);
        expect(ownerAddress).to.be.equal(addr1.address);
      });
      it("the creator of auction should get the bid of the winner", async () => {});
      it("losers should get their bets back", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await marketplace.connect(addr1).makeBid(0, { value: 100 });
        await marketplace.makeBid(0, { value: 70 });

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);
        const marketplaceBalance = await marketplace.provider.getBalance(
          marketplace.address
        );
        expect(marketplaceBalance).to.be.equal(0);
      });
    });
    describe("cancelAuction", () => {
      it("should throw error when canceling twice", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.cancelAuction(0);

        const tx = marketplace.cancelAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if 3 days have not passed", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        const tx = marketplace.cancelAuction(0);
        const reason = "Auction is still active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if item doesn't exist", async () => {
        const tx = marketplace.cancelAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should cancel the auction", async () => {
        await marketplace.createItem();
        await marketplace.listItemOnAuction(0);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.cancelAuction(0);

        const tx = marketplace.finishAuction(0);
        const reason = "Auction was stopped";
        await expect(tx).to.be.revertedWith(reason);
      });
    });
  });

  describe("Events", () => {
    it("should emit CreateItem event", async () => {
      const tx = marketplace.createItem();
      await expect(tx).to.be.emit(marketplace, "CreateItem").withArgs(0);
    });
    it("should emit ListItem event", async () => {
      await marketplace.createItem();
      const tx = marketplace.listItem(0, 10);
      await expect(tx).to.be.emit(marketplace, "ListItem").withArgs(0, 10);
    });
    it("should emit BuyItem event", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      const tx = marketplace.connect(addr1).buyItem(0, { value: 10 });
      await expect(tx)
        .to.be.emit(marketplace, "BuyItem")
        .withArgs(0, addr1.address, 10);
    });
    it("should emit UnlistItem event", async () => {
      await marketplace.createItem();
      await marketplace.listItem(0, 10);
      const tx = marketplace.cancel(0);
      await expect(tx).to.be.emit(marketplace, "UnlistItem").withArgs(0);
    });

    it("should emit ListItemOnAuction event", async () => {
      await marketplace.createItem();

      const tx = await marketplace.listItemOnAuction(0);

      const { blockNumber } = await tx.wait();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block.timestamp;

      await expect(tx)
        .to.be.emit(marketplace, "ListItemOnAuction")
        .withArgs(0, timestamp, timestamp + DURATION);
    });
    it("should emit MakeBid event", async () => {
      await marketplace.createItem();
      await marketplace.listItemOnAuction(0);

      const tx = marketplace.connect(addr1).makeBid(0, { value: 10 });
      await expect(tx)
        .to.be.emit(marketplace, "MakeBid")
        .withArgs(0, addr1.address, 10);
    });
    it("should emit FinishAuction event", async () => {
      await marketplace.createItem();
      await marketplace.listItemOnAuction(0);

      await marketplace.connect(addr1).makeBid(0, { value: 10 });

      await network.provider.send("evm_increaseTime", [DURATION]);
      await network.provider.send("evm_mine");

      const tx = marketplace.finishAuction(0);
      await expect(tx)
        .to.be.emit(marketplace, "FinishAuction")
        .withArgs(0, addr1.address, 10);
    });
    it("should emit FinishAuction event without bidders", async () => {
      await marketplace.createItem();
      await marketplace.listItemOnAuction(0);

      await network.provider.send("evm_increaseTime", [DURATION]);
      await network.provider.send("evm_mine");

      const tx = marketplace.finishAuction(0);
      await expect(tx)
        .to.be.emit(marketplace, "FinishAuction")
        .withArgs(0, marketplace.address, 0);
    });
    it("should emit CancelAuction event", async () => {
      await marketplace.createItem();
      await marketplace.listItemOnAuction(0);

      await network.provider.send("evm_increaseTime", [DURATION]);
      await network.provider.send("evm_mine");

      const tx = await marketplace.cancelAuction(0);
      await expect(tx).to.be.emit(marketplace, "CancelAuction").withArgs(0);
    });
  });
});
