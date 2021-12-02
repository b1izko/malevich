const hre = require("hardhat");

async function main() {
  const MalevichToken = await ethers.getContractFactory("MalevichToken");
  const TriggerNFTContract = await ethers.getContractFactory("TriggerNFTContract");
  const VideoNFTContract = await ethers.getContractFactory("VideoNFTContract");

  malevichToken = await MalevichToken.deploy();
  console.log("MalevichToken deployed to address:", malevichToken.address);

  triggerNFTContract = await TriggerNFTContract.deploy(malevichToken.address, 123456)
  console.log("TriggerNFTContract deployed to address:", triggerNFTContract.address);

  videoNFTContract = await VideoNFTContract.deploy(malevichToken.address, 5000, 1234567890);
  console.log("VideoNFTContract deployed to address:", videoNFTContract.address);

  await malevichToken.allow(triggerNFTContract.address);
  console.log("Minting for TriggerNFTContract is allowed");
  await malevichToken.allow(videoNFTContract.address);
  console.log("Minting for VideoNFTContract is allowed");
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
