const { assert, expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

function getRandomInt(max) {
  let result = 0;
  while (result == 0) {
      result = Math.floor(Math.random() * max)
  }
  return result;
}

describe("Malevich Token", function () {
  
  beforeEach( async () => {
    [alice, bob] = await ethers.getSigners();

    const MalevichToken = await ethers.getContractFactory("MalevichToken");

    malevichToken = await MalevichToken.deploy();
  })

  describe("Access mechanism", function () {
    it("Allow", async() => { 
      await expect(malevichToken.allow(ethers.constants.AddressZero)).
          to.be.revertedWith('MalevichToken: address must not be empty');

      await malevichToken.allow(bob.address);
 
      await expect(malevichToken.getWards(ethers.constants.AddressZero)).
          to.be.revertedWith('MalevichToken: address must not be empty');
      
      expect(await malevichToken.getWards(bob.address)).
          to.be.true;
    })

    it("Deny", async() => { 
      await expect(malevichToken.deny(ethers.constants.AddressZero)).
          to.be.revertedWith('MalevichToken: address must not be empty');

      await malevichToken.deny(bob.address);
 
      await expect(malevichToken.getWards(ethers.constants.AddressZero)).
          to.be.revertedWith('MalevichToken: address must not be empty');
      
      expect(await malevichToken.getWards(bob.address)).
          to.be.false;
    })   
  })

  describe("Access mechanism", function () {
    it("Mint", async() => { 
      await expect(malevichToken.connect(bob).mint(bob.address, BigNumber.from(1234567890))).
          to.be.revertedWith('MalevichToken: caller is not the minter');

      await malevichToken.allow(bob.address);      
      expect(await malevichToken.getWards(bob.address)).
          to.be.true;

      let balanceBefore = await malevichToken.balanceOf(bob.address);
      await malevichToken.connect(bob).mint(bob.address, BigNumber.from(1234567890));
      expect(await malevichToken.balanceOf(bob.address)).
          to.be.equal(BigNumber.from(1234567890).add(balanceBefore));
    })
  })

})