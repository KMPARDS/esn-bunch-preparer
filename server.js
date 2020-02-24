require('dotenv').config();
const express = require('express');
const ethers = require('ethers');
const { fetchBlocksAndReturnMegaRoot } = require('./functions');

const esnNodeUrl = process.env.NODE_ENV === 'production' ? 'http://localhost:8540' : process.env.ESN_PUBLIC_NODE;
const providerESN = new ethers.providers.JsonRpcProvider(esnNodeUrl);


const app = express();

app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Strict-Transport-Security': 'max-age=31536000; preload',
    'Access-Control-Allow-Origin': '*'
  });
  return next();
});

app.get('/ping', async(req, res) => {
  res.send('pong');
});

app.get('/blockNumber', async(req, res) => {
  try {
    const blockNumber = await providerESN.send('eth_blockNumber');
    res.json({status: 'success', data: +blockNumber});
  } catch (error) {
    res.json({status: 'error', message: error.message});
  }
});

app.get('/sign', async(req, res) => {
  try {
    console.log(req.query);

    const startBlockNumber = +req.query.startBlockNumber;
    if(isNaN(startBlockNumber)) {
      throw 'Invalid startBlockNumber';
    }

    const bunchDepth = +req.query.bunchDepth;
    if(isNaN(bunchDepth)) {
      throw 'Invalid bunchDepth';
    }

    const transactionsMegaRoot = await fetchBlocksAndReturnMegaRoot(startBlockNumber, bunchDepth, providerESN);

    const headerArray = [
      ethers.utils.hexlify(startBlockNumber),
      ethers.utils.hexlify(bunchDepth),
      transactionsMegaRoot,
      ethers.constants.HashZero
    ];

    const headerRLP = ethers.utils.RLP.encode(headerArray);

    const signature = await providerESN.send('eth_sign', [process.env.SIGNER_ADDRESS, headerRLP]);

    const signedHeaderRLP = ethers.utils.RLP.encode([
      headerRLP,
      signature
    ]);

    res.json({status: 'success', data: signedHeaderRLP});
  } catch (error) {
    res.json({status: 'error', message: error.message});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on PORT ${port}`));
