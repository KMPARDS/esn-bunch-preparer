require('dotenv').config();
const express = require('express');
const { redisPromise } = require('./redis');

const ethers = require('ethers');
const { tryCatchWrapper, fetchBlocksAndReturnMegaRoot } = require('./functions');

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

app.get('/blockNumber', tryCatchWrapper(async(req, res) => {
  const output = await redisPromise('blockNumber', async() => {
    return await providerESN.send('eth_blockNumber')
  }, 5);

  res.json({ status: 'success', data: output });
}));

app.get('/sign', tryCatchWrapper(async(req, res) => {
  const startBlockNumber = +req.query.startBlockNumber;
  if(isNaN(startBlockNumber)) {
    throw 'Invalid startBlockNumber';
  }

  const bunchDepth = +req.query.bunchDepth;
  if(isNaN(bunchDepth)) {
    throw 'Invalid bunchDepth';
  }

  const output = await redisPromise(`${startBlockNumber}-${bunchDepth}`, async() => {
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

    return signedHeaderRLP;
  });

  res.json({ status: 'success', data: output });
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on PORT ${port}`));
