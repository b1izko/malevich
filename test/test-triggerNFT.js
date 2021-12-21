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

describe("TriggerNFTContract", function () {
  

  beforeEach( async () => {
    [alice, bob] = await ethers.getSigners();

    const MalevichToken = await ethers.getContractFactory("MalevichToken");
    const TriggerNFTContract = await ethers.getContractFactory("TriggerNFTContract");

    malevichToken = await MalevichToken.deploy();
    triggerNFTContract = await TriggerNFTContract.deploy(malevichToken.address, 1234567890);

    await malevichToken.allow(triggerNFTContract.address);
  })

  describe("Testing constructor", function () {
    it("Constructor", async() => { 
        const TriggerNFTContract = await ethers.getContractFactory("TriggerNFTContract"); 
        await expect(TriggerNFTContract.deploy(ethers.constants.AddressZero, 1234567890)).
            to.be.revertedWith('TriggerNFTContract: address must not be empty'); 
    })
  })

  describe("Testing Token", function () {
    it("Mint token", async() => {  
      let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("hello_world"));
      await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("hello_world"))).
            to.emit(triggerNFTContract, 'Transfer').
            withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);  
    })

    it("Token word", async() => {  
        await expect(triggerNFTContract.setTokenWord(getRandomInt(100), ethers.utils.formatBytes32String("hello_world"))).
                to.be.revertedWith('TriggerNFTContract: word query for nonexistent token');

        await expect(triggerNFTContract.tokenWord(getRandomInt(100))).
                to.be.revertedWith('TriggerNFTContract: word query for nonexistent token');

        let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("hello_world"));
        await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("hello_world"))).
              to.emit(triggerNFTContract, 'Transfer').
              withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
              
        expect(await triggerNFTContract.tokenWord(tokenId)).
                to.be.equal(ethers.utils.formatBytes32String("hello_world"));
    })

    it("Reward per token", async() => {  
        let newReward = getRandomInt(9876543210)
        await triggerNFTContract.setRewardPerToken(newReward);
        expect(await triggerNFTContract.getRewardPerToken()).
                to.be.equal(newReward);
    })

    it("Trigger by token", async() => {
        await expect(triggerNFTContract.triggerByToken(getRandomInt(100))).
            to.be.revertedWith('TriggerNFTContract: tokenId query for nonexistent token');
    })
  })

  describe("Testing Trigger", function () {
    it("Create Trigger", async() => {  
        let tokenAmount = getRandomInt(100);
        
        let fakeTokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            fakeTokensId[counter] = counter + 1;
        }

        await expect(triggerNFTContract.createTrigger(fakeTokensId, BigNumber.from(9876543210))).
                to.be.revertedWith('TriggerNFTContract: invalid token ID');

        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }



        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));
    })

    it("Edit Trigger", async() => {  
        let tokenAmount = getRandomInt(100);
        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }

        await expect(triggerNFTContract.editTrigger(getRandomInt(100), tokensId, BigNumber.from(9876543210))).
                to.be.revertedWith('TriggerNFTContract: trigger query for nonexistent token');

        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));

        let newTokenAmount = getRandomInt(100);
        newTokensId = new Array(newTokenAmount);
        for (counter = 0; counter < newTokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("EDITED token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("EDITED token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            newTokensId[counter] = tokenId;
        }

        await expect(triggerNFTContract.editTrigger(triggerId + getRandomInt(100), newTokensId, BigNumber.from(9876543210))).
                to.be.revertedWith('TriggerNFTContract: trigger query for nonexistent token');

        await expect(triggerNFTContract.editTrigger(triggerId, newTokensId, BigNumber.from(9876543210))).
                to.emit(triggerNFTContract, 'EditTrigger').
                withArgs(triggerId, newTokenAmount, BigNumber.from(9876543210));
    })
    
    it("Buy token", async() => {  
        let tokenAmount = getRandomInt(100);
        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }

        expect(await triggerNFTContract.callStatic.buyToken(getRandomInt(tokenAmount))).
            to.be.false;

        await expect(triggerNFTContract.getTokenPrice(getRandomInt(tokenAmount))).
            to.be.revertedWith('TriggerNFTContract: token is not associated with any trigger');

        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));
        
        let purchasedToken = getRandomInt(tokenAmount);
        let tokenPrice = await triggerNFTContract.getTokenPrice(purchasedToken);
        
        await malevichToken.mint(alice.address, tokenPrice);

        await malevichToken.connect(alice).approve(triggerNFTContract.address, tokenPrice);

        await expect(triggerNFTContract.connect(alice).buyToken(purchasedToken)).
                to.emit(triggerNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
        
        await expect(triggerNFTContract.connect(alice).buyToken(purchasedToken)).
                to.be.revertedWith('TriggerNFTContract: token was sold');
    })
    
    it("Testing comleted trigger", async() => { 
        await expect(triggerNFTContract.isTriggerCompleted(getRandomInt(100))).
                to.be.revertedWith('TriggerNFTContract: trigger query for nonexistent token');
        
        await expect(triggerNFTContract.setTriggerQuizzeComplete(getRandomInt(100))).
                to.be.revertedWith('TriggerNFTContract: trigger query for nonexistent token');
        
        let tokenAmount = getRandomInt(100);
        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }

        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));
        
        expect(await triggerNFTContract.isTriggerCompleted(triggerId)).
                to.be.false;

        await triggerNFTContract.setTriggerQuizzeComplete(triggerId);
        
        expect(await triggerNFTContract.isTriggerCompleted(triggerId)).
                to.be.true;
    })
  })

  describe("Testing rewards", function () {
    it("Alice collect reward", async() => {  
        let tokenAmount = getRandomInt(100);
        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }

        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));
                
        let purchasedToken = getRandomInt(tokenAmount);
        let tokenPrice = await triggerNFTContract.getTokenPrice(purchasedToken);
        
        await malevichToken.mint(alice.address, tokenPrice);

        await malevichToken.connect(alice).approve(triggerNFTContract.address, tokenPrice);

        await expect(triggerNFTContract.connect(alice).buyToken(purchasedToken)).
                to.emit(triggerNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
        
        await expect(triggerNFTContract.connect(alice).withdrawReward(purchasedToken)).
                to.be.revertedWith('TriggerNFTContract: trigger not completed');

        await triggerNFTContract.setTriggerQuizzeComplete(triggerId);
        
        expect(await triggerNFTContract.isTriggerCompleted(triggerId)).
                to.be.true;
        
        expect(await triggerNFTContract.isRewardPaid(purchasedToken)).
                to.be.false;
            
        await triggerNFTContract.connect(alice).withdrawReward(purchasedToken);

        expect(await triggerNFTContract.isRewardPaid(purchasedToken)).
                to.be.true;
        
        await expect(triggerNFTContract.connect(alice).withdrawReward(purchasedToken)).
                to.be.revertedWith('TriggerNFTContract: reward was received');
    })

    it("Bob try collect alice reward", async() => {  
        let tokenAmount = getRandomInt(100);
        let tokensId = new Array(tokenAmount);
        for (counter = 0; counter < tokenAmount; counter++) {
            let tokenId = await triggerNFTContract.callStatic.mintToken(ethers.utils.formatBytes32String("token #" + counter));
            await expect(triggerNFTContract.mintToken(ethers.utils.formatBytes32String("token #" + counter))).
                to.emit(triggerNFTContract, 'Transfer').
                withArgs(ethers.constants.AddressZero, triggerNFTContract.address, tokenId);
            tokensId[counter] = tokenId;
        }

        let triggerId = await triggerNFTContract.callStatic.createTrigger(tokensId, BigNumber.from(1234567890));
        await expect(triggerNFTContract.createTrigger(tokensId, BigNumber.from(1234567890))).
                to.emit(triggerNFTContract, 'CreateTrigger').
                withArgs(triggerId, tokenAmount, BigNumber.from(1234567890));
                
        let purchasedToken = getRandomInt(tokenAmount);
        let tokenPrice = await triggerNFTContract.getTokenPrice(purchasedToken);
        
        await malevichToken.mint(alice.address, tokenPrice);

        await malevichToken.connect(alice).approve(triggerNFTContract.address, tokenPrice);

        await expect(triggerNFTContract.connect(alice).buyToken(purchasedToken)).
                to.emit(triggerNFTContract, 'BuyToken').
                withArgs(purchasedToken, alice.address);
        
        await triggerNFTContract.setTriggerQuizzeComplete(triggerId);
        
        expect(await triggerNFTContract.isTriggerCompleted(triggerId)).
                to.be.true;
        
        await expect(triggerNFTContract.isRewardPaid(100 + getRandomInt(100))).
                to.be.revertedWith('TriggerNFTContract: invalid token ID');

        expect(await triggerNFTContract.isRewardPaid(purchasedToken)).
                to.be.false;
            
        await expect(triggerNFTContract.connect(bob).withdrawReward(purchasedToken)).
                to.be.revertedWith('TriggerNFTContract: is not own');

        expect(await triggerNFTContract.isRewardPaid(purchasedToken)).
                to.be.false;
    })
    
  })

})