// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MalevichToken.sol";

// For debugging only
import "hardhat/console.sol";

contract VideoNFTContract is ERC721, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;
    
    uint8 constant tokensPerEdition = 25;
    uint256 quantPeriod;
    uint256 rewardPerQuant;  

    struct Ownership {
        address owner;
        uint256 auctionStartTimestamp;
        uint256 ownershipStartTime;
    }

    struct OwnerReward {
        uint256 rewardPaid;
        uint256 rewardStored;
    }

    struct Edition {
        uint256[tokensPerEdition] tokens;
        uint256 triggerMomentTimestamp;
        uint256 lastUpdateTimestamp;
    }
    
    MalevichToken rewardToken;
    Counters.Counter private _editionIds;
    Counters.Counter private _tokenIds;
    mapping(uint256 => Ownership) private _owners;
    mapping(uint256 => Edition) private _editions;
    mapping(address => OwnerReward) private _ownersReward;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) private _tokenApprovals;

    event CreateEdition(uint256 editionId, uint256 triggerMomentTimestamp);
    event EditEdition(uint256 editionId, uint256 triggerMomentTimestamp);
    event BuyToken(uint256 tokenId, address purchaser);

    constructor(address tokenAddress, uint256 _quantPeriod, uint256 _rewardPerQuant) public ERC721("VideoNFTContract", "VNFT") {
        require(tokenAddress != address(0), "VideoNFTContract: address must not be empty");
        rewardToken = MalevichToken(tokenAddress);
        quantPeriod = _quantPeriod;
        rewardPerQuant = _rewardPerQuant;
    }


    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "VideoNFTContract: balance query for the zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address _owner = _owners[tokenId].owner;
        require(_owner != address(0), "VideoNFTContract: owner query for nonexistent token");
        return _owner;
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        require(to != owner, "VideoNFTContract: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "VideoNFTContract: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_exists(tokenId), "VideoNFTContract: approved query for nonexistent token");

        return _tokenApprovals[tokenId];
    }

    function mintToken(string memory tokenURI, uint256 auctionStartTimestamp) public onlyOwner returns (uint256) {
        //console.log("block.timestamp: ", block.timestamp);
        require(auctionStartTimestamp > block.timestamp, "VideoNFTContract: timestamp cannot be less than the current time");
        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();
        _mint(address(this), newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _setAuctionStartTimestamp(newTokenId, auctionStartTimestamp);
        
        return _tokenIds.current();
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "VideoNFTContract: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];

        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        return _baseURI();
    }

    function setTokenURI(uint256 tokenId, string memory tokenURI) public onlyOwner {
        _setTokenURI(tokenId, tokenURI);
    }

    function getAuctionStartTimestamp(uint256 tokenId) public view returns (uint256) {
        return _owners[tokenId].auctionStartTimestamp;
    }

    function setAuctionStartTimestamp(uint256 tokenId, uint256 auctionStartTimestamp) public onlyOwner {
        _setAuctionStartTimestamp(tokenId, auctionStartTimestamp);
    }

    function getTokenPrice(uint256 tokenId) public view returns (uint256) {
        require(block.timestamp > getAuctionStartTimestamp(tokenId), "VideoNFTContract: auction has not started");
        
        uint256 timestamp = 0;
        if (block.timestamp - getAuctionStartTimestamp(tokenId) < 2 hours){
            timestamp = 2 hours - (block.timestamp - getAuctionStartTimestamp(tokenId));
        }
        timestamp = timestamp - (timestamp % 10 minutes); 

        //console.log("timestamp: ", timestamp);
        
        if (timestamp > 40 minutes) {
            return 25 * 10**14 * timestamp / 3 - 10**18;
        } else  if (timestamp > 10 minutes) {
            return 125 * 10**13 * timestamp / 3;
        } else {
            return 85 * 10**13 * timestamp / 3 + 8 * 10**16;
        }       
    }

    function buyToken(uint256 tokenId) public payable returns (bool) {
        require(ownerOf(tokenId) == address(this), "VideoNFTContract: token was sold");
        uint256 tokenPrice = getTokenPrice(tokenId);
        
        require (msg.value == tokenPrice, "VideoNFTContract: insufficient funds");
        
        _transfer(address(this), _msgSender(), tokenId);
        _owners[tokenId].ownershipStartTime = block.timestamp;

        emit BuyToken(tokenId, _msgSender());

        return true;
    }

    function createEdition(uint256[tokensPerEdition] memory _tokens, uint256 _triggerMomentTimestamp) public onlyOwner returns (uint256) {
        require(_triggerMomentTimestamp > block.timestamp, "VideoNFTContract: timestamp cannot be less than the current time");
        _checkVideoNFTs(_tokens);
        
        _editionIds.increment();
        uint256 newEditionId = _editionIds.current();
        
        _editions[newEditionId].tokens = _tokens;
        _editions[newEditionId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[newEditionId].lastUpdateTimestamp = block.timestamp;

        emit CreateEdition(newEditionId,  _triggerMomentTimestamp);

        return newEditionId;
    }

    function editEdition(uint256 _editionId, uint256[tokensPerEdition] memory _tokens, uint256 _triggerMomentTimestamp) public onlyOwner returns (uint256) {
        require(_triggerMomentTimestamp > block.timestamp, "VideoNFTContract: timestamp cannot be less than the current time");
        
        _checkVideoNFTs(_tokens);
              
        _editions[_editionId].tokens = _tokens;
        _editions[_editionId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[_editionId].lastUpdateTimestamp = block.timestamp;

        emit EditEdition(_editionId,  _triggerMomentTimestamp);

        return _editionId;
    }

    function updateTriggerTime(uint256 editionsId, uint256 _triggerMomentTimestamp) public onlyOwner {
        require(_triggerMomentTimestamp > block.timestamp, "VideoNFTContract: timestamp cannot be less than the current time");
        _editions[editionsId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[editionsId].lastUpdateTimestamp = block.timestamp;
    }

    function isEditionSold(uint256 editionsId) public view returns (bool) {
        for (uint256 counter = 0; counter < tokensPerEdition; counter++){
            if (!isVideoNFTSold(_editions[editionsId].tokens[counter])) return false;
        }
        return true;
    }

    function getEdition(uint256 editionsId) public view returns (
        uint256[tokensPerEdition] memory _tokens, 
        uint256 _triggerMomentTimestamp, 
        uint256 _lastUpdateTimestamp
    ){
        _tokens = _editions[editionsId].tokens;
        _triggerMomentTimestamp = _editions[editionsId].triggerMomentTimestamp;
        _lastUpdateTimestamp = _editions[editionsId].lastUpdateTimestamp;
    }

    

    function getAvailableRewardByToken(uint256 tokenId) public view returns (uint256) {
        (, bool ok) = editionByToken(tokenId);
        require (ok, "VideoNFTContract: token is not associated with any edition");

        require(_owners[tokenId].ownershipStartTime != 0, "VideoNFTContract: token was not sold");
        uint256 tokenReward = rewardPerQuant * ((block.timestamp - _owners[tokenId].ownershipStartTime) / quantPeriod);
        return tokenReward + _ownersReward[_msgSender()].rewardStored - _ownersReward[_msgSender()].rewardPaid;
    }
    
    function getAvailableReward() public view returns (uint256) {
        return _ownersReward[_msgSender()].rewardStored - _ownersReward[_msgSender()].rewardPaid;
    }

    function withdrawRewardByToken(uint256 tokenId, uint256 amount) public returns (bool) {
        require (_owners[tokenId].owner == _msgSender(), "VideoNFTContract: is not own");
        
        (uint256 editionId, bool ok) = editionByToken(tokenId);
        require (ok, "VideoNFTContract: token is not associated with any edition");

        uint256 estimatedTime;
        if (block.timestamp < _editions[editionId].triggerMomentTimestamp){
            estimatedTime = block.timestamp;
        } else {
            estimatedTime = _editions[editionId].triggerMomentTimestamp;
        }

        uint256 tokenReward = rewardPerQuant * ((estimatedTime - _owners[tokenId].ownershipStartTime) / quantPeriod);
        uint256 availableReward = tokenReward + _ownersReward[_msgSender()].rewardStored - _ownersReward[_msgSender()].rewardPaid;
        require (availableReward >= amount, "VideoNFTContract: available reward is less than amount");

        rewardToken.mint(_msgSender(), amount);
        _ownersReward[_msgSender()].rewardPaid = _ownersReward[_msgSender()].rewardPaid + amount;
        
        return true;
    }

    function withdrawReward(uint256 amount) public returns (bool) {
        uint256 availableReward = _ownersReward[_msgSender()].rewardStored;
        require (availableReward >= amount, "VideoNFTContract: available reward is less than amount");

        rewardToken.mint(_msgSender(), amount);
        _ownersReward[_msgSender()].rewardPaid = _ownersReward[_msgSender()].rewardPaid + amount;
        
        return true;
    }


    function editionByToken(uint256 tokenId) public view returns (uint256, bool) {
        require(_exists(tokenId), "VideoNFTContract: tokenId query for nonexistent token");
        for (uint256 editionCounter = 0; editionCounter <= _editionIds.current(); editionCounter++){
            for (uint256 tokenCounter = 0; tokenCounter < _editions[editionCounter].tokens.length; tokenCounter++){
                if (_editions[editionCounter].tokens[tokenCounter] == tokenId) return (editionCounter, true);
            }
        }
        return (0, false);
    }

    function isVideoNFTSold(uint256 tokenId) public view returns (bool) {
        if (_owners[tokenId].ownershipStartTime != 0) return true;
        return false;
    }

    function getQuantPeriod() public view returns (uint256) {
        return quantPeriod;
    }

    function setQuantPeriod(uint256 _quantPeriod) public onlyOwner {
        quantPeriod = _quantPeriod;
    }

    function getRewardPerQuant() public view returns (uint256) {
        return rewardPerQuant;
    }

    function setRewardPerQuant(uint256 _rewardPerQuant) public onlyOwner {
        rewardPerQuant = _rewardPerQuant;
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "VideoNFTContract: transfer caller is not owner nor approved");

        _transfer(from, to, tokenId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        (, bool ok) = editionByToken(tokenId);
        require (ok, "VideoNFTContract: token is not associated with any edition");
        require(ownerOf(tokenId) == from, "VideoNFTContract: transfer of token that is not own");
        require(to != address(0), "VideoNFTContract: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId].owner = to;

        emit Transfer(from, to, tokenId);
    }

    function _mint(address to, uint256 tokenId) internal override {
        require(to != address(0), "VideoNFTContract: mint to the zero address");
        require(!_exists(tokenId), "VideoNFTContract: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId].owner = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal override {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) private {
        require(_exists(tokenId), "VideoNFTContract: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function _setAuctionStartTimestamp(uint256 tokenId, uint256 _auctionStartTimestamp) private {
        require(_exists(tokenId), "VideoNFTContract: auctionStartTimestamp set of nonexistent token");
        _owners[tokenId].auctionStartTimestamp = _auctionStartTimestamp;
    }

    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _owners[tokenId].owner != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
        require(_exists(tokenId), "VideoNFTContract: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _checkVideoNFTs(uint256[tokensPerEdition] memory _tokens) private view {
        for (uint256 counter = 0; counter < tokensPerEdition; counter++){
            require(_exists(_tokens[counter]), "VideoNFTContract: invalid NFT token ID");
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        if (from == address(0) || to == address(0)) return;
        _ownersReward[from].rewardStored = _ownersReward[from].rewardStored + rewardPerQuant * ((block.timestamp - _owners[tokenId].ownershipStartTime) / quantPeriod); 
    }
}

