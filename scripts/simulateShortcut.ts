import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ethersproject/address';

import { FUNCTION_ID_ERC20_APPROVE, SimulationMode } from '../src/constants';
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

  const { commands, state, value } = script;

  // Get labels for known addresses
  const addressToLabel: Map<AddressArg, string> = new Map();
  if (shortcut.getAddressData) {
    const addressToData = shortcut.getAddressData(chainId);
    // Map address to labels
    for (const [address, data] of addressToData) {
      addressToLabel.set(address, data.label);
    }
  }

  // Get addresses for dust tokens from commands
  const tokensDustRaw: Set<AddressArg> = new Set();
  for (const command of commands) {
    if (command.startsWith(FUNCTION_ID_ERC20_APPROVE)) {
      // NB: spender address is the last 20 bytes of the data
      tokensDustRaw.add(getAddress(`0x${command.slice(-40)}`) as AddressArg);
    }
  }
  // NB: tokensOut shouldn't be flagged as dust
  const tokensDust = tokensDustRaw.difference(new Set(tokensOut) as Set<AddressArg>);

  // Get holder addresses for tokens In
  const tokensInHolders: Set<AddressArg> = new Set();
  if (shortcut.getTokenHolder) {
    const tokenToHolder = shortcut.getTokenHolder(chainId);
    for (let i = 0; i < tokensIn.length; i++) {
      const holder = tokenToHolder.get(tokensIn[i]) as AddressArg;
      if (!holder) {
        console.warn(
          `simulateOnForge: no holder found for token: ${tokensIn[i]} (${addressToLabel.get(tokensIn[i])}). ` +
            `If it is missing by mistake, please add it into 'chainIdToTokenHolder' map`,
        );
      }
      tokensInHolders.add(tokenToHolder.get(tokensIn[i]) as AddressArg);
    }
  }

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
