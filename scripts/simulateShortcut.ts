import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';

import { SimulationMode } from '../src/constants';
import { getEncodedData, getShortcut } from '../src/helpers';
import {
  getAmountsInFromArgs,
  getBlockNumberFromArgs,
  getForgePath,
  getRpcUrlByChainId,
  getSimulationModeFromArgs,
} from '../src/helpers';
import { simulateTransactionOnForge } from '../src/simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import { Report, Shortcut } from '../src/types';

const fromAddress = '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11';
const weirollWalletAddress = '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736';

async function simulateShortcutOnQuoter(shortcut: Shortcut, chainId: ChainIds, amountsIn: string[]): Promise<void> {
  const { script, metadata } = await shortcut.build(chainId);

  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';
  if (amountsIn.length != tokensIn.length)
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;

  const { commands, state, value } = script;
  const data = getEncodedData(commands, state);
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
  const report: Report = {
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

  // Addresses labels & Dust tokens data
  const tokensDust: AddressArg[] = [];
  const addressToLabel: Map<AddressArg, string> = new Map();
  if (shortcut.getLabelsData) {
    const labelsData = shortcut.getLabelsData(chainId);
    for (const [address, data] of labelsData.tokenToData) {
      if (data.isTokenDust) tokensDust.push(address);
    }
    // Map protocols to labels
    for (const [address, data] of labelsData.protocolToData) {
      addressToLabel.set(address, data.label);
    }
    // Map tokens to labels
    for (const [address, data] of labelsData.tokenToData) {
      addressToLabel.set(address, data.label);
    }
  }
  // TokensIn holders
  const tokensInHolders: AddressArg[] = [];
  if (shortcut.getTokenTholder) {
    const tokenToHolder = shortcut.getTokenTholder(chainId);
    for (let i = 0; i < tokensIn.length; i++) {
      tokensInHolders.push(tokenToHolder.get(tokensIn[i]) as AddressArg);
    }
  }

  const { commands, state, value } = script;

  simulateTransactionOnForge(
    commands,
    state,
    value,
    tokensIn,
    amountsIn,
    tokensInHolders,
    tokensOut,
    tokensDust,
    addressToLabel,
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
