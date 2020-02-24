const ethers = require('ethers');

async function fetchBlocksAndReturnMegaRoot(startBlockNumber, bunchDepth, providerESN) {
  if(startBlockNumber instanceof ethers.utils.BigNumber) startBlockNumber = startBlockNumber.toNumber();
  if(bunchDepth instanceof ethers.utils.BigNumber) bunchDepth = bunchDepth.toNumber();
  function getMegaRoot(inputArray) {
    if(inputArray.length === 1) return inputArray[0];

    if(inputArray.length && (inputArray.length & (inputArray.length-1)) !== 0) {
      throw new Error('inputArray should be of length of power 2');
    }
    const reducedArray = [];
    inputArray.reduce((accumulator, currentValue) => {
      if(accumulator) {
        // reducedArray.push(`[${accumulator}===${currentValue}]`);
        // console.log(accumulator+' '+(currentValue).slice(2));
        reducedArray.push(ethers.utils.keccak256(accumulator+(currentValue).slice(2)));
        return null;
      } else {
        return currentValue;
      }
    });
    return getMegaRoot(reducedArray);
  }

  const blockNumbersToScan = [...Array(2**bunchDepth).keys()].map(n => n + startBlockNumber);
  // console.log({blockNumbersToScan});
  const blockArray = new Array(2**bunchDepth);
  await Promise.all(blockNumbersToScan.map(number => {
    return new Promise(async function(resolve, reject) {
      const blockNumber = ethers.utils.hexStripZeros(ethers.utils.hexlify(number));
      // console.log({blockNumber});
      const block = await providerESN.send('eth_getBlockByNumber', [
        blockNumber,
        true
      ]);
      console.log(`Received block ${number} from ESN node`);
      blockArray[number - startBlockNumber] = ({
        blockNumber: number,
        transactionsRoot: block.transactionsRoot,
        receiptsRoot: block.receiptsRoot
      });
      // console.log(typeof number)
      resolve();
    });
  }));
  const txRootArray = blockArray.map(block => block.transactionsRoot);
  // console.log({blockArray,txRootArray});
  return getMegaRoot(txRootArray);
}

module.exports = { fetchBlocksAndReturnMegaRoot };
