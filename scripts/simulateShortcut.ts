import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';

import { SimulationMode } from '../src/constants';
import { getShortcut } from '../src/helpers';
import {
  getAmountsInFromArgs,
  getBlockNumberFromArgs,
  getForgePath,
  getRpcUrlByChainId,
  getSimulationModeFromArgs,
} from '../src/helpers';
import { simulateTransactionOnForge } from '../src/simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import { Shortcut } from '../src/types';

const weirollWalletInterface = new Interface([
  'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

const fromAddress = '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11';
const weirollWalletAddress = '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736';

type SimulationReport = {
  quote: Record<string, string>;
  dust: Record<string, string>;
  gas: string;
};

async function simulateShortcutOnQuoter(shortcut: Shortcut, chainId: ChainIds, amountsIn: string[]): Promise<void> {
  const { script, metadata } = await shortcut.build(chainId);

  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';
  if (amountsIn.length != tokensIn.length)
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;

  const { commands, state, value } = script;
  const data = weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
  const tx: APITransaction = {
    from: fromAddress,
    to: weirollWalletAddress,
    data,
    value,
    receiver: weirollWalletAddress,
  };
  const quoteTokens = [...tokensOut, ...tokensIn]; //find dust
  const request: QuoteRequest = {
    chainId,
    transactions: [tx],
    tokenIn: tokensIn,
    tokenOut: quoteTokens,
    amountIn: amountsIn,
  };

  const quote = (await simulateTransactionOnQuoter(request))[0];
  if (quote.status === 'Error') throw quote.error;
  const report: SimulationReport = {
    quote: {},
    dust: {},
    gas: quote.gas,
  };
  tokensOut.forEach((t) => {
    const index = quoteTokens.findIndex((q) => q === t);
    report.quote[t] = quote.amountOut[index];
  });
  tokensIn.forEach((t) => {
    const index = quoteTokens.findIndex((q) => q === t);
    report.dust[t] = quote.amountOut[index];
  });
  console.log('Simulation: ', report);
}

async function simulateOnForge(
  shortcut: Shortcut,
  chainId: ChainIds,
  amountsIn: string[],
  forgePath: string,
  rpcUrl: string,
  blockNumber: number,
): Promise<void> {
  const { script, metadata } = await shortcut.build(chainId);

  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';
  if (amountsIn.length != tokensIn.length)
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;

  const { commands, state, value } = script;

  simulateTransactionOnForge(
    commands,
    state,
    value,
    tokensIn,
    amountsIn,
    tokensOut,
    forgePath,
    chainId,
    rpcUrl,
    blockNumber,
  );
}

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();

    const args: string[] = process.argv;
    const simulatonMode = getSimulationModeFromArgs(args);
    const blockNumber = getBlockNumberFromArgs(args);
    const amountsIn = getAmountsInFromArgs(args);

    switch (simulatonMode) {
      case SimulationMode.FORGE: {
        const rpcUrl = getRpcUrlByChainId(chainId);
        const forgePath = getForgePath();
        await simulateOnForge(shortcut, chainId, amountsIn, forgePath, rpcUrl, blockNumber);
        break;
      }
      case SimulationMode.QUOTER: {
        await simulateShortcutOnQuoter(shortcut, chainId, amountsIn);
        break;
      }
      default:
        throw new Error(`Unsupported simulaton 'mode': ${simulatonMode}. `);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
