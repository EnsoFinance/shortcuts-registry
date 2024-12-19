import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

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

const recipeMarketHubInterface = new Interface([
  'function createCampaign(uint256) external view returns (address)',
  'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

const setterInterface = new Interface([
  'function setSingleValue(uint256 value) external',
  'function setValue(uint256 index, uint256 value) external',
]);

const multicallInterface = new Interface([
  'function aggregate((address, bytes)[]) public returns (uint256, bytes[] memory)',
]);

const fromAddress = '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11';
const recipeMarketHub = '0x65a605E074f9Efc26d9Cf28CCdbC532B94772056';
const multicall = '0x58142bd85E67C40a7c0CCf2e1EEF6eB543617d2A';

async function simulateShortcutOnQuoter(
  shortcut: Shortcut,
  chainId: ChainIds,
  amountsIn: string[],
  rpcUrl: string,
): Promise<void> {
  const { script, metadata } = await shortcut.build(chainId);

  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';
  if (amountsIn.length != tokensIn.length)
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;

  // get next wallet address
  const provider = new StaticJsonRpcProvider(rpcUrl);
  const weirollWalletBytes = await provider.call({
    to: recipeMarketHub,
    data: recipeMarketHubInterface.encodeFunctionData('createCampaign', [0]),
  });
  const weirollWallet = '0x' + weirollWalletBytes.slice(26);

  const { commands, state } = script;

  const calls = [];
  if (shortcut.inputs[chainId].setter) {
    // set min amount out
    const setterData = setterInterface.encodeFunctionData('setSingleValue', [1]); // for min amount out, simulation can set zero
    calls.push([shortcut.inputs[chainId].setter, setterData]);
  }
  // can call executeWeiroll on recipeMarketHub it will automatically deploy a weiroll wallet
  const weirollData = getEncodedData(commands, state);
  calls.push([recipeMarketHub, weirollData]);

  const data = multicallInterface.encodeFunctionData('aggregate', [calls]);

  const tx: APITransaction = {
    from: fromAddress,
    to: multicall,
    data,
    value: '0',
    receiver: weirollWallet,
    executor: weirollWallet,
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

    const rpcUrl = getRpcUrlByChainId(chainId);
    switch (simulatonMode) {
      case SimulationMode.FORGE: {
        const forgePath = getForgePath();
        await simulateOnForge(shortcut, chainId, amountsIn, forgePath, rpcUrl, blockNumber);
        break;
      }
      case SimulationMode.QUOTER: {
        await simulateShortcutOnQuoter(shortcut, chainId, amountsIn, rpcUrl);
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
