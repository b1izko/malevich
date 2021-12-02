const contract = require("../artifacts/contracts/VideoNFTContract.sol/VideoNFTContract.json")

require("dotenv").config()
const API_URL = process.env.API_URL
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.VIDEO_NFT_CONTRACT_ADDRESS;

const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const web3 = createAlchemyWeb3(API_URL)

const contractAddress = CONTRACT_ADDRESS
const videoNFTContract = new web3.eth.Contract(contract.abi, contractAddress)

async function mintVideoNFT(tokenURI) {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest") //get latest nonce

    //the transaction
    const tx = {
        from: PUBLIC_KEY,
        to: contractAddress,
        nonce: nonce,
        gas: 1500000,
        data: videoNFTContract.methods.mint(PUBLIC_KEY, tokenURI).encodeABI(),
    }
  
    const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY)
    signPromise.then((signedTx) => {
        web3.eth.sendSignedTransaction(signedTx.rawTransaction,function (err, hash) {
            if (!err) {
                console.log("The hash of your transaction is: ", 
                hash)
            } else {
              console.log("Something went wrong when submitting your transaction:", err)
            }
          }
        )
      }).catch((err) => {
        console.log("Promise failed:", err)
    })
}
