const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const rp = require('request-promise')
const uuid = require('uuid/v1');
var cors = require('cors');
const nodeAddress = uuid().split('-').join();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors({credentials: true, origin: 'https://healthblock2.herokuapp.com'}));
// parse application/json
app.use(bodyParser.json())
const BLockchain = require('./blockchain');
const bitcoin = new BLockchain();

app.get('/blockchain', function (req, res) {
    res.send(bitcoin);
});

app.post('/transaction', function (req, res) {
    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransaction(newTransaction);
    res.json({ note: `Transaction will be added to index ${blockIndex}` });
});

app.post('/transaction/broadcast', function (req, res) {
    const newTransaction = bitcoin.createNewTransaction(req.body.age, req.body.symptoms, req.body.disease, req.body.treatment, req.body.location, req.body.weight, req.body.url,req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPendingTransaction(newTransaction);
    const requestpromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };
        requestpromises.push(rp(requestOptions));
    });
    Promise.all(requestpromises)
        .then(data => {
            res.json({ note: "Transaction created and broadcast sucessfull" });
        });

});

app.get('/mine', function (req, res) {
    const lastBlock = bitcoin.getLastBLock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);
    bitcoin.createNewTransaction(12.5, '00', nodeAddress);
    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);


    const requestpromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };
        requestpromises.push(rp(requestOptions));
    });
    Promise.all(requestpromises)
        .then(data => {
            const requestOptions = {
                uri: bitcoin.currentNodeURl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 12.5,
                    sender: "00",
                    recepient: nodeAddress
                },
                json: true
            };
            return rp(requestOptions);
        }).then(
            data => {
                res.json({
                    note: "Mined success",
                    block: newBlock
                });
            });
});

app.post('/receive-new-block', function (req,res) {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLastBLock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    if (correctHash && correctIndex) {
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        res.json({
            note: 'New Block received and accepted',
            newBlock: newBlock
        });
    } else {
        res.json({
            note: 'New Block rejected',
            newBlock: newBlock
        });
    }
});

//Register a node and broadcast it to other networks
app.post('/register-and-broadcast-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);
    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        //Register-node
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises).then(
        data => {
            const bulkRegisterOption = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeURl] },
                json: true
            };
            return rp(bulkRegisterOption)
        })
        .then(data => {
            res.json({ note: 'New Node Registered Successfully' });
        });

});

//Register a node with network
app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeURl != newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
    res.json({ note: "new node inserted" });
});

//Register multiple nodes at once
app.post('/register-nodes-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeURl != networkNodeUrl;
        if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl)
    });
    res.json({ note: "bulk registration successfull" });
});

app.get('/consensus', function () {
    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises).then(
        blockchains => {
            const currentChainLength = bitcoin.chain.length;
            let maxChainLength = currentChainLength;
            let newLongestChain = null;
            let newPendingTransaction = null;

            blockchains.forEach(blockchain => {
                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain = blockchain.chain;
                    newPendingTransaction = blockchain.pendingTransactions;
                }
            });
            if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
                res.json({
                    note:"current chain has not been replaced",
                    chain:bitcoin.chain
                });
            }else if(newLongestChain || (newLongestChain && bitcoin.chainIsValid(newLongestChain))){
                bitcoin.chain = newLongestChain;
                bitcoin.pendingTransactions = newPendingTransaction;
                res.json({
                    note:"current chain has been replaced",
                    chain:bitcoin.chain
                });
            }
        });

});


app.get('/block/:blockHash',function(req,res){
const blockHash = req.params.blockHash;
const correctBlock = bitcoin.getBlock(blockHash);
res.json({
    block:correctBlock
});
});

app.get('/transaction/:transactionId',function(req,res){
    const transactionId = req.params.transactionId;
    const transactionData = bitcoin.getTransaction(transactionId);
    res.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    });
});

app.get('/address/:address',function(req,res){
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);
    res.json({
        addressData: addressData
    });
});

port = process.env.PORT || 3000;
app.listen(port, () => console.log('listening to port'+ port));