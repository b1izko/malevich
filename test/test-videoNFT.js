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
    videoNFTContract = await VideoNFTContract.deploy(malevichToken.address, 5000, 1234567890);

    await malevichToken.allow(videoNFTContract.address);
  })
  
  describe("Testing constructor", function () {
    it("Constructor", async() => { 
      const VideoNFTContract = await ethers.getContractFactory("VideoNFTContract"); 
      await expect(VideoNFTContract.deploy(ethers.constants.AddressZero, 5000, 1234567890)).
            to.be.revertedWith('VideoNFTContract: address must not be empty'); 
    })
  })

  describe("Testing mint", function () {
    it("Mint to Alice", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(alice.address, "hello.world");
      await expect(videoNFTContract.mint(alice.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId);
      
      await expect(videoNFTContract.mint(ethers.constants.AddressZero, "hello.world")).
            to.be.revertedWith('VideoNFTContract: mint to the zero address');
    }) 
  })

  describe("Basic transactions", function () {
    it("Transfering Alice's Video NFT to Bob with transferFrom", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(alice.address, "hello.world");
      await expect(videoNFTContract.mint(alice.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId);
      
      await expect(videoNFTContract.connect(bob).transferFrom(alice.address, bob.address, tokenId)).
                to.be.revertedWith('VideoNFTContract: transfer caller is not owner nor approved');

      await videoNFTContract.transferFrom(alice.address, bob.address, tokenId);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));

      await expect(videoNFTContract.transferFrom(alice.address, bob.address, tokenId + 1)).
                to.be.revertedWith('VideoNFTContract: operator query for nonexistent token');
    })

    it("Transfering Alice's Video NFT to Bob with transfer", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(alice.address, "hello.world");
      await expect(videoNFTContract.mint(alice.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId);

      await expect(videoNFTContract.connect(bob).transfer(alice.address, tokenId)).
                to.be.revertedWith('VideoNFTContract: transfer of token that is not own');

      await expect(videoNFTContract.connect(alice).transfer(ethers.constants.AddressZero, tokenId)).
                to.be.revertedWith('VideoNFTContract: transfer to the zero address');
      
      await videoNFTContract.connect(alice).transfer(bob.address, tokenId);
      expect(BigNumber.from(await videoNFTContract.balanceOf(bob.address))).to.equal(BigNumber.from(1));
    }) 
  })

  describe("Testing rewards", function () {
    it("Avalible reward", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(bob.address, "hello.world");
      await expect(videoNFTContract.mint(bob.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, bob.address, tokenId);
      
      await videoNFTContract.connect(bob).sell(tokenId, alice.address);
      
      await expect(videoNFTContract.connect(bob).sell(tokenId, alice.address)).
                to.be.revertedWith('VideoNFTContract: token was sold');

      let rewardBefore = await videoNFTContract.connect(alice).getAvailableReward(tokenId);
      increaseTime(5000);
      expect(await videoNFTContract.connect(alice).getAvailableReward(tokenId)).
                to.equal(BigNumber.from(rewardBefore).add(1234567890));
    })

    it("Withdraw reward", async() => {  
      let tokenAmount = 25;
      let tokensId = new Array(tokenAmount);
      for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await videoNFTContract.callStatic.mint(bob.address, "token #" + counter);
            await expect(videoNFTContract.mint(bob.address, "token #" + counter)).
                to.emit(videoNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, bob.address, tokenId);
            tokensId[counter] = tokenId;
      }
      
      let editionId = await videoNFTContract.callStatic.createEdition(BigNumber.from(1672444800), tokensId);
      await expect(videoNFTContract.createEdition(BigNumber.from(1672444800), tokensId)).
            to.emit(videoNFTContract, 'CreateEdition').
            withArgs(editionId, 1672444800);

      let tokenId = getRandomInt(tokenAmount);      
      await videoNFTContract.connect(bob).sell(tokenId, alice.address);
      
      let rewardBefore = await videoNFTContract.connect(alice).getAvailableReward(tokenId);
      increaseTime(5000);
      expect(await videoNFTContract.connect(alice).getAvailableReward(tokenId)).
                to.equal(BigNumber.from(rewardBefore).add(1234567890));

      await expect(videoNFTContract.connect(bob).withdrawRewardByToken(tokenId, 1234567890)).
                to.be.revertedWith('VideoNFTContract: is not own');

      let balanceBefore = await malevichToken.balanceOf(alice.address);  
      
      await expect(videoNFTContract.connect(alice).withdrawRewardByToken(tokenId, 1234567891)).
                to.be.revertedWith('VideoNFTContract: available reward is less than amount');

      await videoNFTContract.connect(alice).withdrawRewardByToken(tokenId, 1234567890);
      expect(await malevichToken.balanceOf(alice.address)).
                to.equal(BigNumber.from(balanceBefore).add(1234567890));

    })

    it("Access to reward", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(bob.address, "hello.world");
      await expect(videoNFTContract.mint(bob.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, bob.address, tokenId);
      
      await expect(videoNFTContract.connect(bob).getAvailableReward(tokenId)).
                to.be.revertedWith('VideoNFTContract: token was not sold');

      videoNFTContract.connect(bob).sell(tokenId, alice.address);
      await expect(videoNFTContract.connect(bob).getAvailableReward(tokenId)).
                to.be.revertedWith('VideoNFTContract: is not own');
    })
  })

  describe("Checking other functions", function () {
    it("tokenURI", async() => {  
      let tokenId = await videoNFTContract.callStatic.mint(alice.address, "hello.world");
      await expect(videoNFTContract.mint(alice.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId);
      
      await expect(videoNFTContract.tokenURI(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: URI query for nonexistent token');
      
      expect(await videoNFTContract.tokenURI(tokenId)).
            to.equal("hello.world");

      let tokenId_ = await videoNFTContract.callStatic.mint(alice.address, "");
      await expect(videoNFTContract.mint(alice.address, "")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId_);
            
      expect(await videoNFTContract.tokenURI(tokenId_)).
            to.equal("");
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
      let tokenId = await videoNFTContract.callStatic.mint(alice.address, "hello.world");
      await expect(videoNFTContract.mint(alice.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, alice.address, tokenId);

      await expect(videoNFTContract.approve(alice.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: approval to current owner');

      await expect(videoNFTContract.connect(bob).approve(bob.address, tokenId)).
            to.be.revertedWith('VideoNFTContract: approve caller is not owner nor approved for all');
      
      await videoNFTContract.connect(alice).approve(bob.address, tokenId);
      await videoNFTContract.connect(bob).transferFrom(alice.address, bob.address, tokenId)
      
      expect(await videoNFTContract.ownerOf(tokenId)).    
            to.equal(bob.address);
    })
    
    it("getApproved", async() => {      
      await expect(videoNFTContract.getApproved(BigNumber.from(10))).
            to.be.revertedWith('VideoNFTContract: approved query for nonexistent token');
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

    it("isVideoNFTSold", async() => { 
      expect(await videoNFTContract.isVideoNFTSold(BigNumber.from(10))).
            to.be.false;

      let tokenId = await videoNFTContract.callStatic.mint(bob.address, "hello.world");
      await expect(videoNFTContract.mint(bob.address, "hello.world")).
            to.emit(videoNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, bob.address, tokenId);
      
      expect(await videoNFTContract.isVideoNFTSold(tokenId)).
            to.be.false;
      
      await videoNFTContract.connect(bob).sell(tokenId, alice.address);
      expect(await videoNFTContract.isVideoNFTSold(tokenId)).
            to.be.true;
    })
  })

})
