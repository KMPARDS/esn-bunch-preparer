const express = require('express');
const ethers = require('ethers');

const app = express();

app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Strict-Transport-Security': 'max-age=31536000; preload',
    'Access-Control-Allow-Origin': '*'
  });
  return next();
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on PORT ${port}`));
