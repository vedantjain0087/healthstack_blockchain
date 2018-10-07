const sha256 = require('sha256');
const currentNodeURl = process.argv[3];

function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];
    this.currentNodeURl = currentNodeURl;
    this.networkNodes = [];
    this.createNewBlock(100, '0', '0');
}

Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    };
    this.pendingTransactions = [];
    this.chain.push(newBlock);
    return newBlock;
}

Blockchain.prototype.getLastBLock = function () {
    return this.chain[this.chain.length - 1]
}

Blockchain.prototype.createNewTransaction = function (amount, sender, receiver) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        receiver: receiver
    };
    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransaction = function (transactionObj) {
    this.pendingTransactions.push(transactionObj)
    return this.getLastBLock()['index'] + 1
}

Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
}

Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) != "0000") {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

    }
    return nonce;
}

Blockchain.prototype.chainIsValid = function (blockchain) {
    let validChain = true;
    for (let i = 1; i < blockchain.length; i++) {
        const currentBlock = blockchain[i];
        const prevBlock = blockchain[i - 1];
        const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transaction'], index: currentBlock['index'], nonce: currentBlock['nonce'] });
        if (blockHash.substring(0, 4) !== '0000') validChain = false;
        if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain = false;
    }
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 100;
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0';
    const correctHash = genesis['hash'] === '0';

    if (!correctNonce || !correctPreviousBlockHash || !correctHash) validChain = false;
    return validChain;
}

Blockchain.prototype.getBlock = function (blockHash) {
    let correctBLock = null;
    this.chain.forEach(block => {
        if (block.hash == blockHash) correctBLock = block;
    });
    return correctBLock;
}

Blockchain.prototype.getTransaction = function (transactionId) {
    let correctTransaction = null;
    correctBlock = null;
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if (transaction.transactionId === transactionId) {
                correctTransaction = transaction;
                correctBLock = block;
            }
        });
    });
    return ({
        transaction: correctTransaction,
        block: correctBlock
    });
}

Blockchain.prototype.getAddressData = function (address) {
    const addressTransaction = [];
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if (transaction.sender === address || transaction.receiver == address) addressTransaction.push(transaction);
        });
    });
    let balance = 0;
    addressTransaction.forEach(transaction => {
        if (transaction.recipient === address) balance += transaction.amount;
        else if (transaction.sender === address) balance -= transaction.amount;
    });
    return {
        addressTransaction: addressTransaction,
        addressBalance : balance
    }
}

module.exports = Blockchain;
