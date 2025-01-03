import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';

import {
  getEncodedData,
  getPrivateKeyFromArgs,
  getRpcUrlByChainId,
  getShortcut,
  getWalletFromArgs,
} from '../src/helpers';
import { Report } from '../src/types';

const erc20Interface = new Interface(['function balanceOf(address) external view returns (uint256)']);

async function main() {
  try {
    const args: string[] = process.argv;

    const { shortcut, chainId } = await getShortcut(args.slice(2));

    const privateKey = getPrivateKeyFromArgs(args);
    const wallet = getWalletFromArgs(args);

    const rpcUrl = getRpcUrlByChainId(chainId);
    const provider = new StaticJsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);

    const { script, metadata } = await shortcut.build(chainId);
    const { commands, state } = script;

    const { tokensIn, tokensOut } = metadata;
    if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';

    const quoteTokens = [...tokensOut, ...tokensIn]; //find dust

    const tx = await signer.sendTransaction({
      to: wallet,
      data: getEncodedData(commands, state),
    });
    const receipt = await tx.wait();
    console.log('Transaction: ', receipt.transactionHash);
    const balances = await Promise.all(
      quoteTokens.map(async (t) =>
        BigInt(
          await provider.call({ to: t, data: erc20Interface.encodeFunctionData('balanceOf', [wallet]) }),
        ).toString(),
      ),
    );

    const report: Report = {
      quote: {},
      dust: {},
      gas: receipt.gasUsed.toString(),
    };
    tokensOut.forEach((t) => {
      const index = quoteTokens.findIndex((q) => q === t);
      report.quote[t] = balances[index];
    });
    tokensIn.forEach((t) => {
      const index = quoteTokens.findIndex((q) => q === t);
      report.dust[t] = balances[index];
    });
    console.log('Result: ', report);
  } catch (e) {
    console.log(e);
  }
}

main();
