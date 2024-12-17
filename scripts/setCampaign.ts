import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';

import { getMarketIdFromArgs, getPrivateKeyFromArgs, getRpcUrlByChainId, getShortcut } from '../src/helpers';

const depositExecutor: Record<number, string> = {
  [ChainIds.Cartio]: '0xfA72467e6C1a6b8A5F79180583243E5DD9345C71',
};

const depositExecutorInterface = new Interface([
  'function setCampaignDepositRecipe(bytes32, tuple(bytes32[], bytes[])) external',
]);

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();

    const args: string[] = process.argv;
    const privateKey = getPrivateKeyFromArgs(args);
    const marketId = getMarketIdFromArgs(args);

    const rpcUrl = getRpcUrlByChainId(chainId);
    const provider = new StaticJsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);

    const { script, metadata } = await shortcut.build(chainId);
    const { commands, state } = script;

    const { tokensIn, tokensOut } = metadata;
    if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';

    const data = depositExecutorInterface.encodeFunctionData('setCampaignDepositRecipe', [marketId, [commands, state]]);

    const tx = await signer.sendTransaction({
      to: depositExecutor[chainId],
      data,
    });
    const receipt = await tx.wait();
    console.log('Transaction: ', receipt.transactionHash);
  } catch (e) {
    console.log(e);
  }
}

main();
