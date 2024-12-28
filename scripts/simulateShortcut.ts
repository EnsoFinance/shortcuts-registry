import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI,
  DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
  DEFAULT_MIN_AMOUNT_OUT_SLIPPAGE_DIVISOR,
  DEFAULT_SETTER_MIN_AMOUNT_OUT,
  FUNCTION_ID_ERC20_APPROVE,
  ShortcutExecutionMode,
  SimulationMode,
} from '../src/constants';
import { getEncodedData, getShortcut } from '../src/helpers';
import {
  getAmountsInFromArgs,
  getBlockNumberFromArgs,
  getForgePath,
  getRpcUrlByChainId,
  getShortcutExecutionMode,
  getSimulationModeFromArgs,
  getSimulationRolesByChainId,
  getSlippageFromArgs,
} from '../src/helpers';
import { simulateTransactionOnForge } from '../src/simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import type { Report, Shortcut, SimulationRoles } from '../src/types';

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

async function generateMulticallTxData(
  shortcut: Shortcut,
  chainId: ChainIds,
  commands: string[],
  state: string[],
  recipeMarketHubAddr: AddressArg,
  minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT,
): Promise<string> {
  const calls = [];
  if (shortcut.inputs[chainId].setter) {
    // set min amount out
    const setterData = setterInterface.encodeFunctionData('setSingleValue', [minAmountOut]); // for min amount out, simulation can set zero
    calls.push([shortcut.inputs[chainId].setter, setterData]);
  }
  // can call executeWeiroll on recipeMarketHub it will automatically deploy a weiroll wallet
  const weirollData = getEncodedData(commands, state);
  calls.push([recipeMarketHubAddr, weirollData]);

  const data = multicallInterface.encodeFunctionData('aggregate', [calls]);

  return data;
}

async function getNextWeirollWalletFromRecipeMarketHub(
  provider: StaticJsonRpcProvider,
  recipeMarketHub: AddressArg,
): Promise<AddressArg> {
  const weirollWalletBytes = await provider.call({
    to: recipeMarketHub,
    data: recipeMarketHubInterface.encodeFunctionData('createCampaign', [0]),
  });

  return `0x${weirollWalletBytes.slice(26)}`;
}

async function simulateShortcutOnQuoter(
  shortcut: Shortcut,
  chainId: ChainIds,
  amountsIn: string[],
  script: WeirollScript,
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  slippage: BigNumber,
  rpcUrl: string,
  roles: SimulationRoles,
  isRecursiveCall = false,
): Promise<Report> {
  const { commands, state } = script;

  const shortcutExecutionMode = getShortcutExecutionMode(shortcut, chainId);

  let txData: string;
  switch (shortcutExecutionMode) {
    case ShortcutExecutionMode.MULTICALL__AGGREGATE: {
      const provider = new StaticJsonRpcProvider(rpcUrl);
      let minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT;
      // NB: simulate first with `minAmountOut` set to '1' wei and get the actual `amountOut` from quoter.
      // Then, calculate the expected `minAmountOut` after applying maximum slippage, and finally simulate again.
      if (!isRecursiveCall) {
        const report = await simulateShortcutOnQuoter(
          shortcut,
          chainId,
          amountsIn,
          script,
          tokensIn,
          tokensOut,
          slippage,
          rpcUrl,
          roles,
          true,
        );
        const receiptTokenAddr = tokensOut[0]; // NB: Royco campaign shortcuts expect a single receipt token
        const amountOut = report.quote[receiptTokenAddr];
        minAmountOut = BigNumber.from(amountOut)
          .mul(DEFAULT_MIN_AMOUNT_OUT_SLIPPAGE_DIVISOR.sub(slippage))
          .div(DEFAULT_MIN_AMOUNT_OUT_SLIPPAGE_DIVISOR);
      }
      const weirollWallet = await getNextWeirollWalletFromRecipeMarketHub(provider, roles.recipeMarketHub.address!);
      roles.weirollWallet = { address: weirollWallet, label: 'WeirollWallet' };
      roles.callee = roles.multiCall;
      txData = await generateMulticallTxData(
        shortcut,
        chainId,
        commands,
        state,
        roles.recipeMarketHub.address!,
        minAmountOut,
      );
      break;
    }
    case ShortcutExecutionMode.WEIROLL_WALLET__EXECUTE_WEIROLL: {
      txData = getEncodedData(commands, state);
      roles.weirollWallet = roles.defaultWeirollWallet;
      roles.callee = roles.defaultWeirollWallet;
      break;
    }
    default:
      throw new Error(`Unsupported 'shortcutExecutionMode': ${shortcutExecutionMode}`);
  }

  const tx: APITransaction = {
    from: roles.caller.address!,
    to: roles.callee.address!,
    data: txData,
    value: '0',
    receiver: roles.weirollWallet.address,
    executor: roles.weirollWallet.address,
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
  if (!isRecursiveCall) {
    console.log('Simulation: ', report);
  }

  return report;
}

async function simulateShortcutOnForge(
  shortcut: Shortcut,
  chainId: ChainIds,
  amountsIn: string[],
  script: WeirollScript,
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  slippage: BigNumber,
  forgePath: string,
  rpcUrl: string,
  blockNumber: number,
  roles: SimulationRoles,
  isRecursiveCall = false,
): Promise<Report> {
  const { commands, state } = script;

  const shortcutExecutionMode = getShortcutExecutionMode(shortcut, chainId);

  let txData: string;
  let forgeContract: string;
  let forgeContractABI: Record<string, unknown>[];
  let forgeTest: string;
  let forgeTestRelativePath: string;
  switch (shortcutExecutionMode) {
    case ShortcutExecutionMode.MULTICALL__AGGREGATE: {
      const provider = new StaticJsonRpcProvider(rpcUrl);
      let minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT;
      // NB: simulate first with `minAmountOut` set to '1' wei and get the actual `amountOut` from quoter.
      // Then, calculate the expected `minAmountOut` after applying maximum slippage, and finally simulate again.
      if (!isRecursiveCall) {
        const report = await simulateShortcutOnForge(
          shortcut,
          chainId,
          amountsIn,
          script,
          tokensIn,
          tokensOut,
          slippage,
          forgePath,
          rpcUrl,
          blockNumber,
          roles,
          true,
        );
        const receiptTokenAddr = tokensOut[0]; // NB: Royco campaign shortcuts expect a single receipt token
        const amountOut = report.quote[receiptTokenAddr]; // NB: decoded events use lowercase
        minAmountOut = BigNumber.from(amountOut)
          .mul(DEFAULT_MIN_AMOUNT_OUT_SLIPPAGE_DIVISOR.sub(slippage))
          .div(DEFAULT_MIN_AMOUNT_OUT_SLIPPAGE_DIVISOR);
      }
      const weirollWallet = await getNextWeirollWalletFromRecipeMarketHub(provider, roles.recipeMarketHub.address!);
      roles.weirollWallet = { address: weirollWallet, label: 'WeirollWallet' };
      roles.callee = roles.multiCall;
      txData = await generateMulticallTxData(
        shortcut,
        chainId,
        commands,
        state,
        roles.recipeMarketHub.address!,
        minAmountOut,
      );
      forgeContract = 'Simulation_Fork_Test';
      forgeTest = 'test_simulateShortcut_1';
      forgeTestRelativePath = 'test/foundry/fork/Simulation_Fork_Test.t.sol';
      forgeContractABI = CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI;
      break;
    }
    case ShortcutExecutionMode.WEIROLL_WALLET__EXECUTE_WEIROLL: {
      txData = getEncodedData(commands, state);
      roles.weirollWallet = roles.defaultWeirollWallet;
      roles.callee = roles.defaultWeirollWallet;
      forgeContract = 'Simulation_Fork_Test';
      forgeTest = 'test_simulateShortcut_1';
      forgeTestRelativePath = 'test/foundry/fork/Simulation_Fork_Test.t.sol';
      forgeContractABI = CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI;
      break;
    }
    default:
      throw new Error(`Unsupported 'shortcutExecutionMode': ${shortcutExecutionMode}`);
  }

  // Get labels for known addresses
  const addressToLabel: Map<AddressArg, string> = new Map();
  if (shortcut.getAddressData) {
    const addressToData = shortcut.getAddressData(chainId);
    // Map address to labels
    for (const [address, data] of addressToData) {
      addressToLabel.set(address, data.label);
    }
  }
  for (const { address, label } of Object.values(roles)) {
    addressToLabel.set(address, label);
  }

  // Get addresses for dust tokens from commands
  const tokensDustRaw: Set<AddressArg> = new Set();
  for (const command of commands) {
    if (command.startsWith(FUNCTION_ID_ERC20_APPROVE)) {
      // NB: spender address is the last 20 bytes of the data (not checksum)
      tokensDustRaw.add(getAddress(`0x${command.slice(-40)}`));
    }
  }
  // NB: tokensOut shouldn't be flagged as dust
  const tokensDust = tokensDustRaw.difference(new Set(tokensOut) as Set<AddressArg>);

  // Get holder addresses for tokens In
  const tokensInHolders: Set<AddressArg> = new Set();
  if (shortcut.getTokenHolder) {
    const tokenToHolder = shortcut.getTokenHolder(chainId);
    for (let i = 0; i < tokensIn.length; i++) {
      const holder = tokenToHolder.get(tokensIn[i]);
      if (!holder) {
        console.warn(
          `simulateOnForge: no holder found for token: ${tokensIn[i]} (${addressToLabel.get(tokensIn[i])}). ` +
            `If it is missing by mistake, please add it into 'chainIdToTokenHolder' map`,
        );
      }
      tokensInHolders.add(tokenToHolder.get(tokensIn[i]) as AddressArg);
    }
  }
  const forgeData = {
    path: forgePath,
    contract: forgeContract,
    contractABI: forgeContractABI,
    test: forgeTest,
    testRelativePath: forgeTestRelativePath,
  };
  const tokensData = {
    tokensIn,
    tokensInHolders: [...tokensInHolders] as AddressArg[],
    amountsIn: amountsIn as AddressArg[],
    tokensOut,
    tokensDust: [...tokensDust] as AddressArg[],
  };

  const forgeTestLog = simulateTransactionOnForge(
    shortcutExecutionMode,
    roles,
    txData,
    tokensData,
    addressToLabel,
    forgeData,
    chainId,
    rpcUrl,
    blockNumber,
  );

  const testLog = forgeTestLog[`${forgeData.testRelativePath}:${forgeData.contract}`];
  const testResult = testLog.test_results[`${forgeData.test}()`];

  if (!isRecursiveCall) {
    console.log('Simulation (Forge):\n', testResult.decoded_logs.join('\n'));
  }

  // Decode logs to write report
  const contractInterface = new Interface(forgeData.contractABI);

  // Decode Gas
  const gasUsedTopic = contractInterface.getEventTopic('SimulationReportGasUsed');
  const gasUsedLog = testResult.logs.find((log) => log.topics[0] === gasUsedTopic);
  if (!gasUsedLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportGasUsed" used log');
  const gasUsed = contractInterface.parseLog(gasUsedLog).args.gasUsed;

  // Decode Quote
  const quoteTopic = contractInterface.getEventTopic('SimulationReportQuote');
  const quoteLog = testResult.logs.find((log) => log.topics[0] === quoteTopic);
  if (!quoteLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportQuote" used log');
  const quoteTokensOut = contractInterface.parseLog(quoteLog).args.tokensOut;
  const quoteAmountsOut = contractInterface.parseLog(quoteLog).args.amountsOut;

  // Decode Dust
  const dustTopic = contractInterface.getEventTopic('SimulationReportDust');
  const dustLog = testResult.logs.find((log) => log.topics[0] === dustTopic);
  if (!dustLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportDust" used log');
  const dustTokensDust = contractInterface.parseLog(dustLog).args.tokensDust;
  const dustAmountsDust = contractInterface.parseLog(dustLog).args.amountsDust;

  // Instantiate Report
  const report = {
    quote: Object.fromEntries(
      quoteTokensOut.map((key: AddressArg, idx: number) => [key, quoteAmountsOut[idx].toString()]),
    ),
    dust: Object.fromEntries(
      dustTokensDust.map((key: AddressArg, idx: number) => [key, dustAmountsDust[idx].toString()]),
    ),
    gas: gasUsed.toString(),
  };

  if (!isRecursiveCall) {
    console.log('Simulation (Report):\n', JSON.stringify(report, null, 2));
  }
  return report;
}

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();

    const args: string[] = process.argv;
    const simulatonMode = getSimulationModeFromArgs(args);
    const blockNumber = getBlockNumberFromArgs(args);
    const amountsIn = getAmountsInFromArgs(args);

    const rpcUrl = getRpcUrlByChainId(chainId);
    const roles = getSimulationRolesByChainId(chainId);

    const { script, metadata } = await shortcut.build(chainId);

    // Validate tokens
    const { tokensIn, tokensOut } = metadata;
    if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata. Missing eiter "tokensIn" or "tokensOut"';
    if (amountsIn.length != tokensIn.length) {
      throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length} CSVs`;
    }

    // Validate slippage
    // NB: currently only a single slippage is supported due to setter logic interacting with `setSingleValue`
    // and Royco campaign shortcuts expecting a single receipt token
    let slippage = DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE;
    if (shortcut.inputs[chainId].setter) {
      slippage = getSlippageFromArgs(args);
    }

    switch (simulatonMode) {
      case SimulationMode.FORGE: {
        const forgePath = getForgePath();
        await simulateShortcutOnForge(
          shortcut,
          chainId,
          amountsIn,
          script,
          tokensIn,
          tokensOut,
          slippage,
          forgePath,
          rpcUrl,
          blockNumber,
          roles,
        );
        break;
      }
      case SimulationMode.QUOTER: {
        await simulateShortcutOnQuoter(
          shortcut,
          chainId,
          amountsIn,
          script,
          tokensIn,
          tokensOut,
          slippage,
          rpcUrl,
          roles,
        );
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
