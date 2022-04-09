//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Marketplace is MyToken {
    using SafeERC20 for IERC20;
    IERC20 public token;

    uint256 public auctionDuration = 3 days;
    uint256 public minBids = 2;

    struct Auction {
        address seller;
        address winner;
        uint256 winnerRate;
        uint256 finishAt;
        uint256 amountBids;
    }

    struct Item {
        address owner;
        uint256 price;
    }

    mapping(uint256 => Auction) private _auctions;
    mapping(uint256 => Item) private _items;

    event CreateItem(uint256 indexed _tokenId, address indexed _creator, address indexed _owner);
    event ListItem(uint256 indexed _tokenId, address indexed _owner, uint256 _price);
    event BuyItem(uint256 indexed _tokenId, address indexed _buyer, uint256 _price);
    event UnlistItem(uint256 indexed _tokenId);

    event ListItemOnAuction(uint256 indexed _tokenId, uint256 _minPrice, uint256 _startAt, uint256 _finishAt);
    event MakeBid(uint256 indexed _tokenId, address _bidder, uint256 _amount);
    event FinishAuction(uint256 indexed _tokenId, address _winner, uint256 _amount, bool _success);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function createItem(string memory _tokenURI, address _owner) public {
        uint256 tokenId = mint(_owner, _tokenURI);
        emit CreateItem(tokenId, msg.sender, _owner);
    }

    function listItem(uint256 _tokenId, uint256 _price) public {
        require(ownerOf(_tokenId) == msg.sender, "You are not an owner NFT");
        Item storage item = _items[_tokenId];
        require(_price > 0, "Price should be positive");

        _transfer(msg.sender, address(this), _tokenId);

        item.price = _price;
        item.owner = msg.sender;

        emit ListItem(_tokenId, msg.sender, _price);
    }

    function buyItem(uint256 _tokenId) public {
        Item storage item = _items[_tokenId];
        require(item.owner != address(0), "Item is not selling");
        require(token.balanceOf(msg.sender) >= item.price, "Not enough tokens");

        token.safeTransferFrom(msg.sender, item.owner, item.price);
        _transfer(address(this), msg.sender, _tokenId);

        delete item.owner;

        emit BuyItem(_tokenId, msg.sender, item.price);
    }

    function cancel(uint256 _tokenId) public {
        Item storage item = _items[_tokenId];
        require(item.owner == msg.sender, "You are not an owner NFT");

        _transfer(address(this), msg.sender, _tokenId);

        delete item.owner;

        emit UnlistItem(_tokenId);
    }

    function listItemOnAuction(uint256 _tokenId, uint256 _minPrice) public {
        require(ownerOf(_tokenId) == msg.sender, "You are not an owner NFT");
        require(_minPrice > 0, "Minimal price should be positive");

        Auction storage auction = _auctions[_tokenId];
        uint256 finishAt = block.timestamp + auctionDuration;
        auction.finishAt = finishAt;
        auction.winnerRate = _minPrice;
        auction.seller = msg.sender;

        _transfer(msg.sender, address(this), _tokenId);

        emit ListItemOnAuction(_tokenId, _minPrice, block.timestamp, finishAt);
    }

    function makeBid(uint256 _tokenId, uint256 _price) public {
        Auction storage auction = _auctions[_tokenId];
        require(auction.seller != address(0), "Auction is not active");
        require(auction.finishAt > block.timestamp, "Auction is over");
        require(_price > auction.winnerRate, "Bid should be greater");

        token.safeTransferFrom(msg.sender, address(this), _price);

        if (auction.winner != address(0)) {
            token.transfer(auction.winner, auction.winnerRate);
        }

        auction.winner = msg.sender;
        auction.winnerRate = _price;
        auction.amountBids++;

        emit MakeBid(_tokenId, msg.sender, _price);
    }

    function finishAuction(uint256 _tokenId) public {
        Auction storage auction = _auctions[_tokenId];
        require(auction.seller != address(0), "Auction is not active");
        require(block.timestamp >= auction.finishAt, "Auction is still active");

        address tokenRecipient;
        address nftRecipient;
        bool success;

        if (auction.amountBids >= minBids) {
            tokenRecipient = auction.seller;
            nftRecipient = auction.winner;
            success = true;
        } else {
            tokenRecipient = auction.winner;
            nftRecipient = auction.seller;
        }

        token.transfer(tokenRecipient, auction.winnerRate);
        _transfer(address(this), nftRecipient, _tokenId);

        delete auction.seller;

        emit FinishAuction(_tokenId, auction.winner, auction.winnerRate, success);
    }

    function setAuctionDuration(uint256 _duration) public onlyOwner {
        auctionDuration = _duration;
    }

    function setMinBids(uint256 _count) public onlyOwner {
        minBids = _count;
    }

}
