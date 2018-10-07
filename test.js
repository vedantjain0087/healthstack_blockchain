const Blockchain = require('./blockchain');

const bitcoin  = new Blockchain();

const previousBlock = "SSD3434DFE2AAA00A0";
const currentBLockData = [
    {
        amount:100,
        sender:"JHDF7UHYSD8",
        receiver:"DKD8DUISD"
    },
    {
        amount:300,
        sender:"SKDFKJHDF7UHYSD8",
        receiver:"DKSDFDFSD8DUISD"
    }
];
nonce = 201;

x = bitcoin.createNewBlock(nonce, previousBlock, currentBLockData)

console.log(bitcoin);