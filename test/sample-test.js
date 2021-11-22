const { BigNumber } = require("@ethersproject/bignumber");
const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

describe("Malevich", function () {
  
  beforeEach( async () => {
    [alice, bob] = await ethers.getSigners();
    members = [alice.address, bob.address];

    const MalevichToken = await ethers.getContractFactory("MalevichToken");
    const VideoNFTContract = await ethers.getContractFactory("VideoNFTContract");
    const EditionNFTContract = await ethers.getContractFactory("EditionNFTContract");

    malevichToken = await MalevichToken.deploy();
    videoNFTContract = await VideoNFTContract.deploy(malevichToken.address, 5000, 1234567890);
    editionNFTContract = await EditionNFTContract.deploy(videoNFTContract.address);
  })
  
  
  describe("Basic transactions without freezing", function () {
    it("Testing transferring Alice's tokens to Bob with transfer()", async() => {
      videoNFTContract.mint(alice.address, "hello.world");
      
    })

    it("", async() => {
    })
  })
})
