const contract = require("../artifacts/contracts/TriggerNFTContract.sol/TriggerNFTContract.json")
const { ethers } = require("hardhat");

require("dotenv").config()
const API_URL = process.env.API_URL
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.TRIGGER_NFT_CONTRACT_ADDRESS;

const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const web3 = createAlchemyWeb3(API_URL)

const contractAddress = CONTRACT_ADDRESS
const triggerNFTContract = new web3.eth.Contract(contract.abi, contractAddress)

async function mintTriggerToken(tokenWord) {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest") //get latest nonce

    //the transaction
    const tx = {
        from: PUBLIC_KEY,
        to: contractAddress,
        nonce: nonce,
        gas: 1500000,
        data: triggerNFTContract.methods.mintToken(tokenWord).encodeABI(),
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

async function createTrigger(tokenPrice, tokenPriceETH, tokens) {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest") //get latest nonce

    //the transaction
    const tx = {
        from: PUBLIC_KEY,
        to: contractAddress,
        nonce: nonce,
        gas: 1500000,
        data: triggerNFTContract.methods.createTrigger(tokenPrice, tokenPriceETH, tokens).encodeABI(),
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


const tokenWords = [
    "Leo, tortor, sed vit",
    "Dapibus non et risus",
    "Augue nisi ex. Sit i",
    "Sapien lorem dui lib",
    "Sit consectetur inte",
    "Sodales urna odio. S",
    "Lectus dapibus velit",
    "Sit integer sed inte",
    "Libero, sed nisi mat",
    "Amet, sed faucibus. ",
    "Ornare mauris tortor",
    "Cras non luctus sit ",
    "Sed non risus risus ",
    "Tempus ex. Ornare ni",
    "Sit elit. Sed ultric",
    "Interdum lectus nunc",
    "Interdum lectus nunc",
    "Pulvinar odio. Non u",
    "Nulla lorem arcu vul",
    "Adipiscing elit. Aug",
    "Ex. Dictum in sed in",
    "Eget ultricies. Quam",
    "Quis, cursus ut. Qui",
    "Lectus habitasse lec",
    "Dictumst. Amet, tort"
]




