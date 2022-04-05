import { ethers, network } from "hardhat";
import chai, { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Marketplace, Token } from "../typechain";

chai.use(require("chai-bignumber")());

describe("Marketplace Contract", function () {
  let marketplace: Marketplace;
  let ERC20: Token;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let clean: string;

  const DURATION = 60 * 60 * 24 * 3;
  const tokenURI =
    "https://ipfs.io/ipfs/QmWJqAJA7VPzMYCZ1ZF7mfHT9qLY5CQZboB83nLMm4zY7A?filename=BoredApe.json";

  before(async () => {
    const MyToken = await ethers.getContractFactory("Token");
    ERC20 = await MyToken.deploy();
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(ERC20.address);
    [owner, addr1] = await ethers.getSigners();

    clean = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });

  describe("createItem", () => {
    it("should createItem", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
    });
  });
  describe("listItem", () => {
    it("should throw error if somebody else's token", async () => {
      await marketplace.createItem(tokenURI, owner.address);
      const tx = marketplace.connect(addr1).listItem(0, 10);
      const reason = "You are not an owner NFT";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item doesn't exist", async () => {
      const tx = marketplace.connect(addr1).listItem(0, 10);
      const reason = "ERC721: owner query for nonexistent token";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item has already listed", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);

      const tx = marketplace.connect(addr1).listItem(0, 10);
      const reason = "You are not an owner NFT";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item is at auction", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).approve(marketplace.address, 0);
      await marketplace.connect(addr1).listItemOnAuction(0, 10);

      const tx = marketplace.connect(addr1).listItem(0, 10);
      const reason = "You are not an owner NFT";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if price equals zero", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);

      const tx = marketplace.connect(addr1).listItem(0, 0);
      const reason = "Price should be positive";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should freeze nft", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);

      const nftOwner = await marketplace.ownerOf(0);
      expect(nftOwner).to.be.equal(marketplace.address);
    });
    it("should list item after cancel", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);
      await marketplace.connect(addr1).cancel(0);
      await marketplace.connect(addr1).listItem(0, 10);

      const nftOwner = await marketplace.ownerOf(0);
      expect(nftOwner).to.be.equal(marketplace.address);
    });
    it("should emit ListItem event", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).approve(marketplace.address, 0);
      const tx = marketplace.connect(addr1).listItem(0, 10);

      await expect(tx)
        .to.be.emit(marketplace, "ListItem")
        .withArgs(0, addr1.address, 10);
    });
  });
  describe("buyItem", () => {
    it("should throw error when buying item twice", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);

      await ERC20.approve(marketplace.address, 20);
      await marketplace.buyItem(0);

      const tx = marketplace.buyItem(0);
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if not enough ERC20 tokens", async () => {
      await marketplace.createItem(tokenURI, owner.address);
      await marketplace.listItem(0, 10);
      await ERC20.connect(addr1).approve(marketplace.address, 10);

      const tx = marketplace.connect(addr1).buyItem(0);
      const reason = "Not enough tokens";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error if item doesn't exist", async () => {
      await ERC20.connect(addr1).approve(marketplace.address, 10);

      const tx = marketplace.connect(addr1).buyItem(0);
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should change owner", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);

      await ERC20.approve(marketplace.address, 10);
      await marketplace.buyItem(0);
      const nftOwner = await marketplace.ownerOf(0);
      expect(nftOwner).to.be.equal(owner.address);
    });
    it("should transfer ERC20 tokens to seller", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);

      await ERC20.approve(marketplace.address, 10);
      await marketplace.buyItem(0);
      const tokenBalance = await ERC20.balanceOf(addr1.address);
      expect(tokenBalance).to.be.equal(10);
    });
    it("should emit BuyItem event", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);
      await ERC20.approve(marketplace.address, 10);

      const tx = marketplace.buyItem(0);
      await expect(tx).to.be.emit(marketplace, "BuyItem");
    });
  });
  describe("cancel", () => {
    it("should throw error when canceling someone else's token", async () => {
      await marketplace.createItem(tokenURI, owner.address);
      await marketplace.listItem(0, 10);

      const tx = marketplace.connect(addr1).cancel(0);
      const reason = "You are not an owner NFT";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should throw error when canceling non listed item", async () => {
      await marketplace.createItem(tokenURI, owner.address);

      const tx = marketplace.cancel(0);
      const reason = "Item is not selling";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should return nft", async () => {
      await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
      await marketplace.connect(addr1).listItem(0, 10);
      await marketplace.connect(addr1).cancel(0);

      const nftOwner = await marketplace.ownerOf(0);
      expect(nftOwner).to.be.equal(addr1.address);
    });
  });
  describe("Auction", () => {
    describe("listItemOnAuction", () => {
      it("should throw error if item doesn't exist", async () => {
        const tx = marketplace.connect(addr1).listItemOnAuction(0, 10);
        const reason = "ERC721: owner query for nonexistent token";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error when list on auction someone else's token", async () => {
        await marketplace.createItem(tokenURI, owner.address);

        const tx = marketplace.connect(addr1).listItemOnAuction(0, 10);
        const reason = "You are not an owner NFT";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if minimal price equals zero", async () => {
        await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
        const tx = marketplace.connect(addr1).listItemOnAuction(0, 0);
        const reason = "Minimal price should be positive";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if list item on auction twice", async () => {
        await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
        await marketplace.connect(addr1).listItemOnAuction(0, 10);
        const tx = marketplace.connect(addr1).listItemOnAuction(0, 10);
        const reason = "You are not an owner NFT";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should freeze nft", async () => {
        await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
        await marketplace.connect(addr1).listItemOnAuction(0, 10);

        const nftOwner = await marketplace.ownerOf(0);
        expect(nftOwner).to.be.equal(marketplace.address);
      });
      it("should emit ListItemOnAuction event", async () => {
        await marketplace.connect(addr1).createItem(tokenURI, addr1.address);
        const tx = marketplace.connect(addr1).listItemOnAuction(0, 10);
        await expect(tx).to.be.emit(marketplace, "ListItemOnAuction");
      });
    });
    describe("makeBid", () => {
      it("should throw error if auction is not active", async () => {
        const tx = marketplace.makeBid(0, 10);
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if price is lower", async () => {
        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);
        const tx = marketplace.makeBid(0, 0);
        const reason = "Bid should be greater";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if price equals previous", async () => {
        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);
        const tx = marketplace.makeBid(0, 10);
        const reason = "Bid should be greater";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should return lower bid", async () => {
        await ERC20.transfer(addr1.address, 50);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await ERC20.approve(marketplace.address, 20);
        await ERC20.connect(addr1).approve(marketplace.address, 50);

        await marketplace.makeBid(0, 20);

        const beforeBalance = await ERC20.balanceOf(owner.address);
        await marketplace.connect(addr1).makeBid(0, 50);

        const afterBalance = await ERC20.balanceOf(owner.address);
        const different = afterBalance.mod(beforeBalance);

        expect(different).to.be.eq(20);
      });
    });
    describe("finishAuction", () => {
      it("should throw error if auction is not active", async () => {
        const tx = marketplace.finishAuction(0);
        const reason = "Auction is not active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should throw error if call function earlier than auctionDuration", async () => {
        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        const tx = marketplace.finishAuction(0);
        const reason = "Auction is still active";
        await expect(tx).to.be.revertedWith(reason);
      });
      it("should return nft to the owner when bids lower than 2", async () => {
        await ERC20.transfer(addr1.address, 11);
        await ERC20.connect(addr1).approve(marketplace.address, 11);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.connect(addr1).makeBid(0, 11);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const nftOwner = await marketplace.ownerOf(0);
        expect(nftOwner).to.be.equal(owner.address);
      });
      it("should return tokens to the winner when bids lower than 2", async () => {
        await ERC20.transfer(addr1.address, 11);
        await ERC20.connect(addr1).approve(marketplace.address, 11);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.connect(addr1).makeBid(0, 11);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const balance = await ERC20.balanceOf(addr1.address);
        expect(balance).to.be.equal(11);
      });
      it("should transfer nft to the winner", async () => {
        await ERC20.transfer(addr1.address, 30);
        await ERC20.connect(addr1).approve(marketplace.address, 30);
        await ERC20.approve(marketplace.address, 20);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.makeBid(0, 20);
        await marketplace.connect(addr1).makeBid(0, 30);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const nftOwner = await marketplace.ownerOf(0);
        expect(nftOwner).to.be.equal(addr1.address);
      });
      it("should transfer tokens to the owner", async () => {
        const startBalance = await ERC20.balanceOf(owner.address);

        await ERC20.mint(addr1.address, 30);
        await ERC20.connect(addr1).approve(marketplace.address, 30);
        await ERC20.approve(marketplace.address, 20);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.makeBid(0, 20);
        await marketplace.connect(addr1).makeBid(0, 30);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        await marketplace.finishAuction(0);

        const finalBalance = await ERC20.balanceOf(owner.address);
        expect(finalBalance).to.be.equal(startBalance.add(30));
      });
      it("should emit FinishAuction event success", async () => {
        await ERC20.transfer(addr1.address, 30);
        await ERC20.connect(addr1).approve(marketplace.address, 30);
        await ERC20.approve(marketplace.address, 20);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.makeBid(0, 20);
        await marketplace.connect(addr1).makeBid(0, 30);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        const tx = marketplace.finishAuction(0);

        await expect(tx)
          .to.be.emit(marketplace, "FinishAuction")
          .withArgs(0, addr1.address, 30, true);
      });
      it("should emit FinishAuction event no success", async () => {
        await ERC20.mint(addr1.address, 20);
        await ERC20.connect(addr1).approve(marketplace.address, 20);

        await marketplace.createItem(tokenURI, owner.address);
        await marketplace.listItemOnAuction(0, 10);

        await marketplace.connect(addr1).makeBid(0, 20);

        await network.provider.send("evm_increaseTime", [DURATION]);
        await network.provider.send("evm_mine");

        const tx = marketplace.finishAuction(0);

        await expect(tx)
          .to.be.emit(marketplace, "FinishAuction")
          .withArgs(0, addr1.address, 20, false);
      });
    });
  });
  describe("setAuctionDuration", () => {
    it("should throw error if call by user", async () => {
      const tx = marketplace.connect(addr1).setAuctionDuration(DURATION * 2);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should call by owner", async () => {
      const tx = marketplace.setAuctionDuration(DURATION * 2);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).not.to.be.revertedWith(reason);
    });
    it("should change", async () => {
      await marketplace.setAuctionDuration(DURATION * 2);
      const _auctionDuration = await marketplace.auctionDuration();
      expect(_auctionDuration).to.be.equal(DURATION * 2);
    });
  });
  describe("setMinBids", () => {
    it("should throw error if call by user", async () => {
      const tx = marketplace.connect(addr1).setMinBids(3);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should call by owner", async () => {
      const tx = marketplace.setMinBids(3);
      const reason = "Ownable: caller is not the owner";
      await expect(tx).not.to.be.revertedWith(reason);
    });
    it("should change", async () => {
      await marketplace.setMinBids(3);
      const minBids = await marketplace.minBids();
      expect(minBids).to.be.equal(3);
    });
  });
});
