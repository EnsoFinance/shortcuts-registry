import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import type { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI,
  DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
  DEFAULT_SETTER_MIN_AMOUNT_OUT,
  FUNCTION_ID_ERC20_APPROVE,
  MAX_BPS,
  MIN_BPS,
  ShortcutExecutionMode,
  SimulationMode,
} from '../src/constants';
import {
  getAmountsInFromArgs,
  getBasisPointsFromArgs,
  getBlockNumberFromArgs,
  getEncodedData,
  getForgePath,
  getIsCalldataLoggedFromArgs,
  getRpcUrlByChainId,
  getShortcut,
  getShortcutExecutionMode,
  getSimulationModeFromArgs,
  getSimulationRolesByChainId,
  getUsdcToMintHoney,
} from '../src/helpers';
import { simulateTransactionOnForge } from '../src/simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import type {
  MultiCallData,
  Report,
  SetterInputData,
  SetterInputToIndex,
  Shortcut,
  SimulationLogConfig,
  SimulationRoles,
} from '../src/types';

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
  setterInputToIndex: SetterInputToIndex,
  commands: string[],
  state: string[],
  setterAddr: AddressArg,
  recipeMarketHubAddr: AddressArg,
  inputToValue: Record<string, BigNumberish | undefined>,
): Promise<MultiCallData> {
  let setterData: [AddressArg, string][] = [];
  const setterInputData: SetterInputData = {};
  const calls: [AddressArg, string][] = [];
  [...setterInputToIndex].forEach((input, index) => {
    const value = inputToValue[input];
    if (value === undefined) throw `Input not set: ${input}`;
    const setterData = setterInterface.encodeFunctionData('setValue', [index, value]);
    setterInputData[input] = { value: value.toString(), index: Number(index) };
    calls.push([setterAddr, setterData]);
  });

  setterData = [...calls];
  // can call executeWeiroll on recipeMarketHub it will automatically deploy a weiroll wallet
  const weirollData = getEncodedData(commands, state);
  calls.push([recipeMarketHubAddr, weirollData]);
  const txData = multicallInterface.encodeFunctionData('aggregate', [calls]);

  return { setterInputData, setterData, txData };
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
  setterArgsBps: Record<string, BigNumber>,
  rpcUrl: string,
  roles: SimulationRoles,
  shortcutExecutionMode: ShortcutExecutionMode,
  isRecursiveCall = false,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const { commands, state } = script;

  const reportPre: Partial<Report> = {};
  let txData: string;
  switch (shortcutExecutionMode) {
    case ShortcutExecutionMode.MULTICALL__AGGREGATE: {
      const provider = new StaticJsonRpcProvider(rpcUrl);
      const weirollWallet = await getNextWeirollWalletFromRecipeMarketHub(provider, roles.recipeMarketHub.address!);
      roles.weirollWallet = { address: weirollWallet, label: 'WeirollWallet' };
      roles.callee = roles.multiCall;

      const setterInputs = shortcut.setterInputs?.[chainId];
      if (!setterInputs) throw 'Error: Setter inputs not found, how did we get here?';

      let minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney;
      if (setterInputs.has('minAmountOut')) {
        minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT;
        // NB: simulate first with `minAmountOut` set to '1' wei and get the actual `amountOut` from quoter.
        // Then, calculate the expected `minAmountOut` after applying maximum slippage, and finally simulate again.
        if (isRecursiveCall) {
          const report = await simulateShortcutOnQuoter(
            shortcut,
            chainId,
            amountsIn,
            script,
            tokensIn,
            tokensOut,
            setterArgsBps,
            rpcUrl,
            roles,
            shortcutExecutionMode,
            !isRecursiveCall,
            { ...simulationLogConfig, isReportLogged: false, isCalldataLogged: false },
          );
          const receiptTokenAddr = tokensOut[0]; // NB: Royco campaign shortcuts expect a single receipt token
          const amountOut = report.quote[receiptTokenAddr];
          minAmountOut = BigNumber.from(amountOut).mul(MAX_BPS.sub(setterArgsBps.slippage)).div(MAX_BPS);
        }

        reportPre.minAmountOut = minAmountOut.toString();
        reportPre.minAmountOutHex = minAmountOut.toHexString();
      }

      if (setterInputs.has('minAmount0Bps')) minAmount0Bps = setterArgsBps.minAmount0Bps;

      if (setterInputs.has('minAmount1Bps')) minAmount1Bps = setterArgsBps.minAmount1Bps;

      if (setterInputs.has('usdcToMintHoney')) {
        const usdcAmountIn = amountsIn[0]; // this assumes a single-sided deposit
        const island = shortcut.inputs[chainId].island; // assumes we are minting honey for a kodiak island
        if (!island) throw 'Error: Shortcut not supported for calculating usdc to mint';

        usdcToMintHoney = await getUsdcToMintHoney(provider, chainId, usdcAmountIn, island, setterArgsBps.skewRatio);
      }

      const multiCallData = await generateMulticallTxData(
        shortcut.setterInputs![chainId],
        commands,
        state,
        roles.setter.address!,
        roles.recipeMarketHub.address!,
        { minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney },
      );
      txData = multiCallData.txData;

      if (simulationLogConfig.isCalldataLogged) {
        console.log('Simulation (setter calldata):\n', multiCallData.setterData, '\n');
        console.log('Simulation (setter data):\n', multiCallData.setterInputData, '\n');
      }

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
    weirollWallet: getAddress(roles.weirollWallet.address!),
    amountsIn,
    minAmountOut: reportPre.minAmountOut,
    minAmountOutHex: reportPre.minAmountOutHex,
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

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Report):\n', report, '\n');
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
  setterArgsBps: Record<string, BigNumber>,
  forgePath: string,
  rpcUrl: string,
  blockNumber: number,
  roles: SimulationRoles,
  shortcutExecutionMode: ShortcutExecutionMode,
  isRecursiveCall = false,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const { commands, state } = script;

  const reportPre: Partial<Report> = {};
  let txData: string;
  let forgeContract: string;
  let forgeContractABI: Record<string, unknown>[];
  let forgeTest: string;
  let forgeTestRelativePath: string;
  switch (shortcutExecutionMode) {
    case ShortcutExecutionMode.MULTICALL__AGGREGATE: {
      const provider = new StaticJsonRpcProvider(rpcUrl);

      const weirollWallet = await getNextWeirollWalletFromRecipeMarketHub(provider, roles.recipeMarketHub.address!);
      roles.weirollWallet = { address: weirollWallet, label: 'WeirollWallet' };
      roles.callee = roles.multiCall;

      const setterInputs = shortcut.setterInputs?.[chainId];
      if (!setterInputs) throw 'Error: Setter inputs not found, how did we get here?';

      let minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney;
      if (setterInputs.has('minAmountOut')) {
        minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT;
        // NB: simulate first with `minAmountOut` set to '1' wei and get the actual `amountOut` from quoter.
        // Then, calculate the expected `minAmountOut` after applying maximum slippage, and finally simulate again.
        if (isRecursiveCall) {
          const report = await simulateShortcutOnForge(
            shortcut,
            chainId,
            amountsIn,
            script,
            tokensIn,
            tokensOut,
            setterArgsBps,
            forgePath,
            rpcUrl,
            blockNumber,
            roles,
            shortcutExecutionMode,
            !isRecursiveCall,
            { ...simulationLogConfig, isReportLogged: false, isCalldataLogged: false },
          );
          const receiptTokenAddr = tokensOut[0]; // NB: Royco campaign shortcuts expect a single receipt token
          const amountOut = report.quote[receiptTokenAddr]; // NB: decoded events use lowercase
          minAmountOut = BigNumber.from(amountOut).mul(MAX_BPS.sub(setterArgsBps.slippage)).div(MAX_BPS);
        }

        reportPre.minAmountOut = minAmountOut.toString();
        reportPre.minAmountOutHex = minAmountOut.toHexString();
      }

      if (setterInputs.has('minAmount0Bps')) minAmount0Bps = setterArgsBps.minAmount0Bps;

      if (setterInputs.has('minAmount1Bps')) minAmount1Bps = setterArgsBps.minAmount1Bps;

      if (setterInputs.has('usdcToMintHoney')) {
        const usdcAmountIn = amountsIn[0]; // this assumes a single-sided deposit
        const island = shortcut.inputs[chainId].island; // assumes we are minting honey for a kodiak island
        if (!island) throw 'Error: Shortcut not supported for calculating usdc to mint';

        usdcToMintHoney = await getUsdcToMintHoney(provider, chainId, usdcAmountIn, island, setterArgsBps.skewRatio);
      }

      const multiCallData = await generateMulticallTxData(
        shortcut.setterInputs![chainId],
        commands,
        state,
        roles.setter.address!,
        roles.recipeMarketHub.address!,
        { minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney },
      );
      txData = multiCallData.txData;

      if (simulationLogConfig.isCalldataLogged) {
        console.log('Simulation (setter calldata):\n', multiCallData.setterData, '\n');
        console.log('Simulation (setter data):\n', multiCallData.setterInputData, '\n');
      }

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
  // console.log('forgeTestLog:\n', JSON.stringify(forgeTestLog, null, 2), '\n');
  const testLog = forgeTestLog[`${forgeData.testRelativePath}:${forgeData.contract}`];
  const testResult = testLog.test_results[`${forgeData.test}()`];

  if (testResult.status === 'Failure') {
    throw new Error(
      `Forge simulation test failed. Uncomment '--json' and re-run this script to inspect the forge logs`,
    );
  }

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Forge):\n', testResult.decoded_logs.join('\n'), '\n');
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
    weirollWallet: getAddress(roles.weirollWallet.address!),
    amountsIn,
    minAmountOut: reportPre.minAmountOut,
    minAmountOutHex: reportPre.minAmountOutHex,
    quote: Object.fromEntries(
      quoteTokensOut.map((key: AddressArg, idx: number) => [key, quoteAmountsOut[idx].toString()]),
    ),
    dust: Object.fromEntries(
      dustTokensDust.map((key: AddressArg, idx: number) => [key, dustAmountsDust[idx].toString()]),
    ),
    gas: gasUsed.toString(),
  };

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Report):\n', report, '\n');
  }

  return report;
}

export async function main_(args: string[]): Promise<Report> {
  const { shortcut, chainId } = await getShortcut(args.slice(2));

  const simulatonMode = getSimulationModeFromArgs(args);
  const blockNumber = getBlockNumberFromArgs(args);
  const amountsIn = getAmountsInFromArgs(args);

  const rpcUrl = getRpcUrlByChainId(chainId);
  const roles = getSimulationRolesByChainId(chainId);
  const simulationLogConfig = {
    isReportLogged: true,
    isCalldataLogged: getIsCalldataLoggedFromArgs(args),
  };

  const { script, metadata } = await shortcut.build(chainId);

  // Validate tokens
  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata. Missing eiter "tokensIn" or "tokensOut"';
  if (amountsIn.length != tokensIn.length) {
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length} CSVs`;
  }

  // Validate slippage
  // NB: currently only a single slippage is supported due Royco campaign shortcuts expecting a single receipt token
  const shortcutExecutionMode = getShortcutExecutionMode(shortcut, chainId);
  const setterArgsBps: Record<string, BigNumber> = {
    slippage: DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
    skewRatio: MAX_BPS,
    minAmount0Bps: MIN_BPS,
    minAmount1Bps: MIN_BPS,
  };
  let isRecursiveCall = false;
  if ([ShortcutExecutionMode.MULTICALL__AGGREGATE].includes(shortcutExecutionMode)) {
    // adjust default values with user inputted values
    Object.keys(setterArgsBps).forEach((key) => {
      setterArgsBps[key] = getBasisPointsFromArgs(args, key, setterArgsBps[key].toString());
    });
    isRecursiveCall = !setterArgsBps.slippage.eq(DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE);
  }

  let report: Report;
  switch (simulatonMode) {
    case SimulationMode.FORGE: {
      const forgePath = getForgePath();
      report = await simulateShortcutOnForge(
        shortcut,
        chainId,
        amountsIn,
        script,
        tokensIn,
        tokensOut,
        setterArgsBps,
        forgePath,
        rpcUrl,
        blockNumber,
        roles,
        shortcutExecutionMode,
        isRecursiveCall,
        simulationLogConfig,
      );
      break;
    }
    case SimulationMode.QUOTER: {
      report = await simulateShortcutOnQuoter(
        shortcut,
        chainId,
        amountsIn,
        script,
        tokensIn,
        tokensOut,
        setterArgsBps,
        rpcUrl,
        roles,
        shortcutExecutionMode,
        isRecursiveCall,
        simulationLogConfig,
      );
      break;
    }
    default:
      throw new Error(`Unsupported simulaton 'mode': ${simulatonMode}. `);
  }

  return report;
}

async function main() {
  try {
    await main_(process.argv);
  } catch (error) {
    console.error(error);
  }
}

main();
