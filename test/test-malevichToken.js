const { assert, expect } = require("chai");
const { ethers } = require("hardhat");


describe("VideoNFTContract", function () {
  
  beforeEach( async () => {
    [alice, bob] = await ethers.getSigners();

    const MalevichToken = await ethers.getContractFactory("MalevichToken");

    malevichToken = await MalevichToken.deploy();

    await malevichToken.allow(videoNFTContract.address);
  })

})