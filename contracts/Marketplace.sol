//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ERC721.sol";

contract Marketplace is MyToken {
    uint256 constant public DURATION = 3 days;

    struct Auction {
        uint256 startAt;
        uint256 finishAt;
        bool active;
        mapping(address => uint256) bids;
        address[] bidders;
    }

    struct Item {
        uint256 price;
        bool selling;
        bool sold;
    }

    mapping(uint256 => Auction) auctions;
    mapping(uint256 => Item) items;

    event CreateItem(uint256 _tokenId);
    event ListItem(uint256 _tokenId, uint256 _price);
    event BuyItem(uint256 _tokenId, address buyer, uint256 _price);
    event UnlistItem(uint256 _tokenId);

    event ListItemOnAuction(uint256 _tokenId, uint256 _startAt, uint256 _finishAt);
    event MakeBid(uint256 _tokenId, address _bidder, uint256 _amount);
    event FinishAuction(uint256 _tokenId, address _winner, uint256 _amount);
    event CancelAuction(uint256 _tokenId);

    function createItem() public onlyOwner {
        uint256 tokenId = mint(address(this));
        emit CreateItem(tokenId);
    }

    function listItem(uint256 _tokenId, uint256 _price) public onlyOwner {
        require(ownerOf(_tokenId) == address(this), 'Token was sold');

        Item storage item = items[_tokenId];
        require(item.selling == false, 'Item is selling');
        require(auctions[_tokenId].active == false, 'Item is at auction');
        require(_price > 0, 'Price should be positive');

        item.price = _price;
        item.selling = true;

        emit ListItem(_tokenId, _price);
    }

    function buyItem(uint256 _tokenId) external payable {
        Item storage item = items[_tokenId];
        require(item.selling, 'Item is not selling');
        require(msg.value >= item.price, 'Not enough');

        _transfer(address(this), msg.sender, _tokenId);

        item.selling = false;
        item.sold = true;
        item.price = msg.value;

        emit BuyItem(_tokenId, msg.sender, msg.value);
    }

    function cancel(uint256 _tokenId) external onlyOwner {
        Item storage item = items[_tokenId];
        require(item.selling, 'Item is not selling');

        item.selling = false;

        emit UnlistItem(_tokenId);
    }

    function listItemOnAuction(uint256 _tokenId) public onlyOwner {
        require(ownerOf(_tokenId) == address(this), 'Token was sold');
        Auction storage auction = auctions[_tokenId];
        require(auction.active == false, 'Auction is active');

        uint256 finishAt = block.timestamp + DURATION;
        auction.active = true;
        auction.startAt = block.timestamp;
        auction.finishAt = finishAt;

        emit ListItemOnAuction(_tokenId, block.timestamp, finishAt);
    }

    function makeBid(uint256 _tokenId) external payable {
        require(msg.value > 0, 'Value should be positive');
        Auction storage auction = auctions[_tokenId];
        require(auction.active, 'Auction is not active');

        if (auction.bids[msg.sender] == 0) {
            auction.bidders.push(msg.sender);
        }

        auction.bids[msg.sender] += msg.value;
        emit MakeBid(_tokenId, msg.sender, msg.value);
    }

    function finishAuction(uint256 _tokenId) external onlyOwner {
        Auction storage auction = auctions[_tokenId];
        require(auction.active, 'Auction was stopped');
        require(block.timestamp >= auction.finishAt, 'Auction is still active');

        delete auction.active;

        if (auction.bidders.length == 0) {
            emit FinishAuction(_tokenId, address(this), 0);
            return;
        }

        address payable _winner = payable(auction.bidders[0]);
        uint256 _winnerRate = auction.bids[_winner];

        for (uint i = 1; i < auction.bidders.length; i++) {
            address payable candidate = payable(auction.bidders[i]);
            uint256 candidateRate = auction.bids[candidate];

            if (candidateRate > _winnerRate) {
                _winner.transfer(_winnerRate);
                _winner = candidate;
                _winnerRate = candidateRate;
                continue;
            }

            candidate.transfer(candidateRate);
        }

        address payable _to = payable(msg.sender);
        _to.transfer(_winnerRate);
        _transfer(address(this), _winner, _tokenId);
        emit FinishAuction(_tokenId, _winner, _winnerRate);
    }

    function cancelAuction(uint256 _tokenId) external onlyOwner {
        Auction storage auction = auctions[_tokenId];
        require(auction.active, 'Auction was stopped');
        require(block.timestamp >= auction.finishAt, 'Auction is still active');

        for (uint i = 0; i < auction.bidders.length; i++) {
            address payable bidder = payable(auction.bidders[i]);
            bidder.transfer(auction.bids[bidder]);
        }

        delete auction.active;
        emit CancelAuction(_tokenId);
    }

}
