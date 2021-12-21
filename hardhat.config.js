require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");

const { RINKEBY_API_URL, ROPSTEN_API_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

module.exports = {
   solidity: "0.8.0",
   networks: {
      hardhat: {
         allowUnlimitedContractSize: true,
      },
      rinkeby: {
         url: RINKEBY_API_URL,
         accounts: [`0x${PRIVATE_KEY}`]
      },
      ropsten: {
         url: ROPSTEN_API_URL,
         accounts: [`0x${PRIVATE_KEY}`]
      }
   },
   etherscan: {
      apiKey: ETHERSCAN_API_KEY,
   },
   skipFiles: ['node_modules']
}