//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./VideoNFTContract.sol";


contract EditionNFTContract is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _editionIds;
    
    VideoNFTContract videoNFTContract;

    uint8 constant tokensPerEdition = 25;

    struct Owner {
        address owner;
        uint256 ownershipStartTime;
    }

    struct Edition {
        uint256[tokensPerEdition] videoNFT;
        uint256 triggerMomentTimestamp;
        uint256 lastUpdateTimestamp;
    }

    mapping(uint256=>Edition) private _editions;

    constructor(address videoNFTAddress) public ERC721("EditionNFTContract", "ENFT") {
        require(videoNFTAddress != address(0), "EditionNFTContract: address must not be empty");
        videoNFTContract = VideoNFTContract(videoNFTAddress);
    }    
    
    function createEdition(uint256 _triggerMomentTimestamp, uint256[tokensPerEdition] memory _videoNFT) external onlyOwner returns (uint256) {
        require(_triggerMomentTimestamp > block.timestamp, "EditionNFTContract: timestamp cannot be less than the current time");
        _checkEditionsNFT(_videoNFT);
        
        _editionIds.increment();
        uint256 newEditionId = _editionIds.current();
        
        _editions[newEditionId].videoNFT = _videoNFT;
        _editions[newEditionId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[newEditionId].lastUpdateTimestamp = block.timestamp;

        return newEditionId;
    }

    function editEdition(uint256 _editionId, uint256 _triggerMomentTimestamp, uint256[tokensPerEdition] memory _videoNFT) external onlyOwner returns (uint256) {
        require(_triggerMomentTimestamp > block.timestamp, "EditionNFTContract: timestamp cannot be less than the current time");
        _checkEditionsNFT(_videoNFT);
              
        _editions[_editionId].videoNFT = _videoNFT;
        _editions[_editionId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[_editionId].lastUpdateTimestamp = block.timestamp;

        return _editionId;
    }

    function updateTriggerTime(uint256 editionsId, uint256 _triggerMomentTimestamp) external onlyOwner returns (bool){
        require(_triggerMomentTimestamp > block.timestamp, "EditionNFTContract: timestamp cannot be less than the current time");
        _editions[editionsId].triggerMomentTimestamp = _triggerMomentTimestamp;
        _editions[editionsId].lastUpdateTimestamp = block.timestamp;
        return true;
    }


    function getEditions(uint256 editionsId) public view returns (
        uint256[tokensPerEdition] memory _videoNFT, uint256 _triggerMomentTimestamp, uint256 _lastUpdateTimestamp
    ){
        _videoNFT = _editions[editionsId].videoNFT;
        _triggerMomentTimestamp = _editions[editionsId].triggerMomentTimestamp;
        _lastUpdateTimestamp = _editions[editionsId].lastUpdateTimestamp;
    }

    function isEditionSold(uint256 editionsId) public view returns (bool) {
        for (uint256 counter = 0; counter < tokensPerEdition; counter++){
            if (!videoNFTContract.isVideoNFTSold(_editions[editionsId].videoNFT[counter])) return false;
        }
        return true;
    }

    function _checkEditionsNFT(uint256[tokensPerEdition] memory _videoNFT) private view {
        for (uint256 counter = 0; counter < tokensPerEdition; counter++){
            require(videoNFTContract.exists(_videoNFT[counter]), "EditionNFTContract: invalid NFT token ID");
        }
    }
}