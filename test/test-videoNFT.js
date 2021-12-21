const { BigNumber } = require("@ethersproject/bignumber");
const { assert, expect } = require("chai");
const { ethers } = require("hardhat");


function increaseTime(time){
  ethers.provider.send("evm_increaseTime", [time]);
  ethers.provider.send("evm_mine");
}

function getRandomInt(max) {
      let result = 0;
      while (result == 0) {
          result = Math.floor(Math.random() * max)
      }
      return result;
  }

describe("VideoNFTContract", function () {
  
  beforeEach( async () => {
    [alice, bob] = await ethers.getSigners();

    const MalevichToken = await ethers.getContractFactory("MalevichToken");
    const VideoNFTContract = await ethers.getContractFactory("VideoNFTContract");

    malevichToken = await MalevichToken.deploy();
    videoNFTContract = await VideoNFTContract.deploy(malevichToken.address, 1800, 1234567890, 600);

    await malevichToken.allow(videoNFTContract.address);
  })
  
  describe("Testing constructor", function () {
    it("Constructor", async() => { 
      const VideoNFTContract = await ethers.getContractFactory("VideoNFTContract"); 
      await expect(VideoNFTContract.deploy(ethers.constants.AddressZero, 1800, 1234567890, 600)).
            to.be.revertedWith('VideoNFTContract: address must not be empty'); 
    })
  })

  describe("Testing mint", function () {
    it("Mint to Alice", async() => {
      let timestamp = new Date('Jan 1, 19 00:00:00 GMT+00:00');
      let auctionTimestamp = Math.floor(timestamp.getTime() / 1000);  
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.be.revertedWith('VideoNFTContract: timestamp cannot be less than the current time'); 

      const latestBlock = await ethers.provider.getBlock("latest");
      auctionTimestamp = latestBlock.timestamp + 300;
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
    }) 
  })

  describe("Basic transactions", function () {
    it("Transfering Alice's Video NFT to Bob with transferFrom", async() => {    
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300; 
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);
      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = BigNumber.from(tokenId);
      }

      let timestamp = new Date('Jan 1, 19 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
            to.be.revertedWith('VideoNFTContract: timestamp cannot be less than the current time');

      timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      triggerMoment = Math.floor(timestamp.getTime() / 1000);


      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      let {0: _tokens, 1: _triggerMomentTimestamp, 2: _lastUpdateTimestamp} = await videoNFTContract.getEdition(editionId);
      expect(_triggerMomentTimestamp).to.equal(BigNumber.from(triggerMoment)); 
 
      increaseTime(300);
      let purchasedToken = getRandomInt(tokenAmount);

      await expect(videoNFTContract.connect(bob).transferFrom(alice.address, bob.address, purchasedToken)).
                to.be.revertedWith('VideoNFTContract: transfer caller is not owner nor approved');

      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);

      await expect(videoNFTContract.connect(bob).buyToken(purchasedToken, {value: BigNumber.from(tokenPrice).sub(1)})).
            to.be.revertedWith('VideoNFTContract: insufficient funds');

      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
                to.emit(videoNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
      
      await expect(videoNFTContract.connect(bob).buyToken(purchasedToken, {value: tokenPrice})).
            to.be.revertedWith('VideoNFTContract: token was sold');

      await videoNFTContract.transferFrom(alice.address, bob.address, purchasedToken);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));

      await expect(videoNFTContract.transferFrom(alice.address, bob.address, purchasedToken + 25)).
                to.be.revertedWith('VideoNFTContract: operator query for nonexistent token');
    })

    it("Transfering Alice's Video NFT to Bob with transfer", async() => {  
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
      
      await expect(videoNFTContract.connect(alice).transfer(bob.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: token is not associated with any edition');


      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      increaseTime(300);
      let purchasedToken = getRandomInt(tokenAmount);

      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);

      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
                to.emit(videoNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);

      let anotherToken = getRandomInt(tokenAmount);
      while (anotherToken == purchasedToken) {
            anotherToken = getRandomInt(tokenAmount);
      }

      await expect(videoNFTContract.connect(alice).transfer(bob.address, anotherToken)).
                to.be.revertedWith('VideoNFTContract: transfer of token that is not own');

      await expect(videoNFTContract.connect(alice).transfer(ethers.constants.AddressZero, purchasedToken)).
            to.be.revertedWith('VideoNFTContract: transfer to the zero address');

      await videoNFTContract.connect(alice).transfer(bob.address, purchasedToken);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));
    }) 
  })

  describe("Testing rewards", function () {
    it("Avalible reward", async() => {  
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);

      await expect(videoNFTContract.getAvailableRewardByToken(tokenId)).
            to.be.revertedWith('VideoNFTContract: token is not associated with any edition');

      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);
      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);
      increaseTime(300);
      let purchasedToken = getRandomInt(tokenAmount);
      

      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);
      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
            to.emit(videoNFTContract, 'BuyToken').
            withArgs(purchasedToken, alice.address);

      let anotherToken = getRandomInt(tokenAmount);
      while (anotherToken == purchasedToken) {
            anotherToken = getRandomInt(tokenAmount);
      }
      await expect(videoNFTContract.connect(alice).getAvailableRewardByToken(anotherToken)).
            to.be.revertedWith('VideoNFTContract: token was not sold');

      let rewardBefore = await videoNFTContract.connect(alice).getAvailableRewardByToken(purchasedToken);
      increaseTime(1800);
      expect(await videoNFTContract.connect(alice).getAvailableRewardByToken(purchasedToken)).
                to.equal(BigNumber.from(rewardBefore).add(1234567890));

      await videoNFTContract.connect(alice).transfer(bob.address, purchasedToken);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));
      expect(await videoNFTContract.connect(alice).getAvailableReward()).
            to.equal(BigNumber.from(rewardBefore).add(1234567890));
      
    })

    it("Withdraw reward", async() => {  
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300; 
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);

      await expect(videoNFTContract.getAvailableRewardByToken(tokenId)).
            to.be.revertedWith('VideoNFTContract: token is not associated with any edition');

      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);
      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let triggerMoment = latestBlock.timestamp + 4000;
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      increaseTime(300);
      let purchasedToken = getRandomInt(tokenAmount);
      

      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);
      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
            to.emit(videoNFTContract, 'BuyToken').
            withArgs(purchasedToken, alice.address);

      let anotherToken = getRandomInt(tokenAmount);
      while (anotherToken == purchasedToken) {
            anotherToken = getRandomInt(tokenAmount);
      }

      tokenPrice = await videoNFTContract.getTokenPrice(anotherToken);
      await expect(videoNFTContract.connect(alice).buyToken(anotherToken, {value: tokenPrice})).
            to.emit(videoNFTContract, 'BuyToken').
            withArgs(anotherToken, alice.address);

      let rewardBefore = await videoNFTContract.connect(alice).getAvailableRewardByToken(purchasedToken);
      increaseTime(1800);
      expect(await videoNFTContract.connect(alice).getAvailableRewardByToken(purchasedToken)).
                to.equal(BigNumber.from(rewardBefore).add(1234567890));

      await expect(videoNFTContract.connect(bob).withdrawRewardByToken(purchasedToken, 1234567890)).
                to.be.revertedWith('VideoNFTContract: is not own');

      let balanceBefore = await malevichToken.balanceOf(alice.address);  
      
      await expect(videoNFTContract.connect(alice).withdrawRewardByToken(purchasedToken, 1234567891)).
                to.be.revertedWith('VideoNFTContract: available reward is less than amount');

      await videoNFTContract.connect(alice).withdrawRewardByToken(purchasedToken, 1234567890);
      expect(await malevichToken.balanceOf(alice.address)).
                to.equal(BigNumber.from(balanceBefore).add(1234567890));
      
      await videoNFTContract.connect(alice).transfer(bob.address, anotherToken);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));
      
      increaseTime(3600);

      await videoNFTContract.connect(alice).withdrawReward(1234567890);
      expect(await malevichToken.balanceOf(alice.address)).
                to.equal(BigNumber.from(balanceBefore).add(2469135780));

      await expect(videoNFTContract.connect(alice).withdrawReward(1234567891)).
                to.be.revertedWith('VideoNFTContract: available reward is less than amount');
      
      await videoNFTContract.connect(alice).withdrawRewardByToken(purchasedToken, 1234567890);
      expect(await malevichToken.balanceOf(alice.address)).
                to.equal(BigNumber.from(balanceBefore).add(3703703670));

      
    })
  })

  describe("Checking other functions", function () {
    it("tokenURI", async() => {  
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
      
      await expect(videoNFTContract.tokenURI(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: URI query for nonexistent token');
      
      expect(await videoNFTContract.tokenURI(tokenId)).
            to.equal("hello.world");
      
      let tokenId_ = await videoNFTContract.callStatic.mintToken("hello.world!", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world!", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId_);
      
      await expect(videoNFTContract.setTokenURI(BigNumber.from(10), "")).
            to.be.revertedWith('VideoNFTContract: URI set of nonexistent token');

      await videoNFTContract.setTokenURI(tokenId_, "");
      
      expect(await videoNFTContract.tokenURI(tokenId_)).
            to.equal("");
    }) 

    it("AuctionStartTimestamp", async() => {  
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
      
      expect(await videoNFTContract.getAuctionStartTimestamp(tokenId)).
            to.equal(BigNumber.from(auctionTimestamp));
      
      await expect(videoNFTContract.setAuctionStartTimestamp(BigNumber.from(10), auctionTimestamp)).
            to.be.revertedWith('VideoNFTContract: auctionStartTimestamp set of nonexistent token');

      await videoNFTContract.setAuctionStartTimestamp(tokenId, auctionTimestamp + 200);
      
      expect(await videoNFTContract.getAuctionStartTimestamp(tokenId)).
            to.equal(BigNumber.from(auctionTimestamp).add(200));
    })    

    it("balanceOf", async() => {      
      await expect(videoNFTContract.balanceOf(ethers.constants.AddressZero)).
            to.be.revertedWith('VideoNFTContract: balance query for the zero address');
    })

    it("ownerOf", async() => {      
      await expect(videoNFTContract.ownerOf(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: owner query for nonexistent token');
    })

    it("approve", async() => {      
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);

      await expect(videoNFTContract.approve(videoNFTContract.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: approval to current owner');

      await expect(videoNFTContract.connect(bob).approve(bob.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: approve caller is not owner nor approved for all');
      
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      increaseTime(300);
      let purchasedToken = getRandomInt(tokenAmount);

      expect(await videoNFTContract.isVideoNFTSold(purchasedToken)).
            to.be.false;
      
      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);

      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
                to.emit(videoNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
      
      await videoNFTContract.connect(alice).approve(bob.address, purchasedToken);
      await videoNFTContract.connect(bob).transferFrom(alice.address, bob.address, purchasedToken)
      
      expect(await videoNFTContract.ownerOf(purchasedToken)).    
            to.equal(bob.address);
    })
    

    it("getApproved", async() => {      
      await expect(videoNFTContract.getApproved(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: approved query for nonexistent token');
    })

    it("Price Update Time", async() => {      
      await videoNFTContract.setPriceUpdateTime(BigNumber.from(55555));
      expect(await videoNFTContract.getPriceUpdateTime()).
            to.equal(BigNumber.from(55555));
    })

    it("Quant Period", async() => {      
      await videoNFTContract.setQuantPeriod(BigNumber.from(55555));
      expect(await videoNFTContract.getQuantPeriod()).
            to.equal(BigNumber.from(55555));
    })

    it("Reward Per Quant", async() => {      
      await videoNFTContract.setRewardPerQuant(BigNumber.from(9876543210));
      expect(await videoNFTContract.getRewardPerQuant()).
            to.equal(BigNumber.from(9876543210));
    })

    it("editionByToken", async() => {      
      await expect(videoNFTContract.editionByToken(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: tokenId query for nonexistent token');
    })

    it("isVideoNFTSold", async() => { 
      expect(await videoNFTContract.isVideoNFTSold(BigNumber.from(10))).
            to.be.false;

      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
      await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
      
      await expect(videoNFTContract.connect(alice).transfer(bob.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: token is not associated with any edition');


      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      let purchasedToken = getRandomInt(tokenAmount);

      await expect(videoNFTContract.getTokenPrice(purchasedToken)).
            to.be.revertedWith('VideoNFTContract: auction has not started');

      increaseTime(300);
      

      expect(await videoNFTContract.isVideoNFTSold(purchasedToken)).
            to.be.false;
      
      let tokenPrice = await videoNFTContract.getTokenPrice(purchasedToken);

      await expect(videoNFTContract.connect(alice).buyToken(purchasedToken, {value: tokenPrice})).
                to.emit(videoNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
      
      expect(await videoNFTContract.isVideoNFTSold(purchasedToken)).
            to.be.true;
    })

    it("isEditionSold", async() => { 
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      increaseTime(300);

      for (counter = 1; counter <= tokenAmount; counter++) {
            expect(await videoNFTContract.isEditionSold(editionId)).
                  to.be.false;
            let tokenPrice = await videoNFTContract.getTokenPrice(counter);
            await expect(videoNFTContract.connect(bob).buyToken(counter, {value: tokenPrice})).
                  to.emit(videoNFTContract, 'BuyToken').
                  withArgs(counter, bob.address);
      }
     
      expect(await videoNFTContract.isEditionSold(editionId)).
                  to.be.true;
    })

    it("editEdition", async() => { 
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      
      await videoNFTContract.setTriggerTime(editionId, triggerMoment + 1000);
      let editedTokensId = new Array(tokenAmount);
      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("edited token #" + counter, auctionTimestamp + 600);
            await expect(videoNFTContract.mintToken("edited token #" + counter, auctionTimestamp + 600)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            editedTokensId[counter] = tokenId;
      }
      
      timestamp = new Date('Jan 1, 19 00:00:00 GMT+00:00');
      triggerMoment = Math.floor(timestamp.getTime() / 1000);

      await expect(videoNFTContract.setTriggerTime(editionId, triggerMoment)).
            to.be.revertedWith('VideoNFTContract: timestamp cannot be less than the current time');

      await expect(videoNFTContract.editEdition(editionId, editedTokensId, triggerMoment, auctionTime, startPrice, endPrice)).
            to.be.revertedWith('VideoNFTContract: timestamp cannot be less than the current time');
      
      timestamp = new Date('Jan 1, 23 00:00:00 GMT+00:00');
      triggerMoment = Math.floor(timestamp.getTime() / 1000);
      auctionTime = 3600;
      startPrice = BigNumber.from(10).pow(17).mul(25);
      endPrice = BigNumber.from(10).pow(16).mul(8);
      await videoNFTContract.setTriggerTime(editionId, triggerMoment);
            
      await expect(videoNFTContract.editEdition(editionId, editedTokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'EditEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);
    })

    it("getTokenPrice", async() => { 
      const latestBlock = await ethers.provider.getBlock("latest");
      let auctionTimestamp = latestBlock.timestamp + 300;  
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);

      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mintToken("hello.world", auctionTimestamp);
            await expect(videoNFTContract.mintToken("hello.world", auctionTimestamp)).
                  to.emit(videoNFTContract, 'Transfer').
                  withArgs(ethers.constants.AddressZero, videoNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
      }

      let timestamp = new Date('Jan 1, 22 00:00:00 GMT+00:00');
      let triggerMoment = Math.floor(timestamp.getTime() / 1000);
      let auctionTime = 7200;
      let startPrice = BigNumber.from(10).pow(18).mul(5);
      let endPrice = BigNumber.from(10).pow(16).mul(8);

      let editionId = await videoNFTContract.callStatic.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice);
      await expect(videoNFTContract.createEdition(tokensId, triggerMoment, auctionTime, startPrice, endPrice)).
                to.emit(videoNFTContract, 'CreateEdition').
                withArgs(editionId, triggerMoment, auctionTime, startPrice, endPrice);

      let purchasedToken = getRandomInt(tokenAmount);
      
      
      //``````````````````````````````````````````````
      //                FOR CHECK PRICE
      //``````````````````````````````````````````````
      
      //increaseTime(300);
      //let priceUpdateTime = BigNumber.from(await videoNFTContract.getPriceUpdateTime()).toNumber();
      //console.log("Price Update Time: ", priceUpdateTime);
      //for (timer = 0; timer < auctionTime; timer = timer + priceUpdateTime) {
      //      console.log("Price: ", BigNumber.from(await videoNFTContract.getTokenPrice(purchasedToken)).toString());
      //      increaseTime(priceUpdateTime);
      //}

      increaseTime(300);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(17).mul(44), BigNumber.from(10).pow(17).mul(46));

      increaseTime(600);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(17).mul(39), BigNumber.from(10).pow(17).mul(40));      
      
      increaseTime(4200);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(16).mul(50), BigNumber.from(10).pow(16).mul(60));

      
      increaseTime(600);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(16).mul(40), BigNumber.from(10).pow(16).mul(60));
      
      increaseTime(600);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(16).mul(20), BigNumber.from(10).pow(16).mul(30));    
      
      increaseTime(600);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.within(BigNumber.from(10).pow(16).mul(5), BigNumber.from(10).pow(16).mul(15));     
      
      increaseTime(600);
      expect(await videoNFTContract.getTokenPrice(purchasedToken)).
            to.equal(BigNumber.from(10).pow(16).mul(8));
    })
  })

})
