import { isAddressEqual } from '@ensofinance/shortcuts-builder/helpers';
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
  PRECISION,
  ShortcutExecutionMode,
  SimulationMode,
  chainIdToDeFiAddresses,
} from '../constants';
import { simulateTransactionOnForge } from '../simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../simulations/simulateOnQuoter';
import type {
  Report,
  SafeTransaction,
  SetterCallData,
  SetterInputData,
  SetterInputToIndex,
  Shortcut,
  SimulationLogConfig,
  SimulationRoles,
} from '../types';
import { getForgePath } from './args';
import { getEncodedData, getHoneyExchangeRate, getIslandMintAmounts, getIslandTokens } from './call';

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

// TODO: this may have to support on-chain getter functions
const usdcExchangeRates: Record<number, Record<AddressArg, BigNumber>> = {
  [ChainIds.Cartio]: {
    [chainIdToDeFiAddresses[ChainIds.Cartio]!.usdc]: BigNumber.from(10).pow(6),
    [chainIdToDeFiAddresses[ChainIds.Cartio]!.nect]: BigNumber.from(10).pow(18),
  },
};

export function encodeMulticall(calls: [AddressArg, string][]) {
  return multicallInterface.encodeFunctionData('aggregate', [calls]);
}

export async function generateSetterCallData(
  setterInputToIndex: SetterInputToIndex | undefined,
  setterAddr: AddressArg,
  inputToValue: Record<string, BigNumberish | undefined>,
): Promise<SetterCallData> {
  const setterData: [AddressArg, string][] = [];
  const setterInputData: SetterInputData = {};
  const safeTransactions: SafeTransaction[] = [];

  if (setterInputToIndex) {
    [...setterInputToIndex].forEach((input, index) => {
      const value = inputToValue[input];
      if (value === undefined) throw `Input not set: ${input}`;
      const method = 'setValue';
      const data = setterInterface.encodeFunctionData(method, [index, value]);

      setterInputData[input] = { value: value.toString(), index: Number(index) };
      setterData.push([setterAddr, data]);

      const safeTransaction: SafeTransaction = {
        to: setterAddr,
        data: null,
        value: '0',
        contractMethod: {
          name: method,
          inputs: [
            {
              name: 'index',
              type: 'uint256',
              internalType: 'uint256',
            },
            {
              name: 'value',
              type: 'uint256',
              internalType: 'uint256',
            },
          ],
          payable: false,
        },
        contractInputsValues: {
          index: String(index),
          value: String(value),
        },
      };
      safeTransactions.push(safeTransaction);
    });
  }

  // can call executeWeiroll on recipeMarketHub it will automatically deploy a weiroll wallet
  return { setterInputData, setterData, safeTransactions };
}

export async function getSetters(
  shortcut: Shortcut,
  chainId: ChainIds,
  script: WeirollScript,
  amountsIn: string[],
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  setterArgsBps: Record<string, BigNumber>,
  rpcUrl: string,
  roles: SimulationRoles,
  simulationMode: SimulationMode,
  blockNumber?: number,
): Promise<Record<string, BigNumber | undefined>> {
  const provider = new StaticJsonRpcProvider(rpcUrl);

  const setterInputs = shortcut.setterInputs?.[chainId];

  let minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney;
  if (setterInputs) {
    if (setterInputs.has('minAmountOut')) {
      minAmountOut = DEFAULT_SETTER_MIN_AMOUNT_OUT;
      if (!setterArgsBps.slippage.eq(DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE)) {
        // NB: simulate first with `minAmountOut` set to '1' wei and get the actual `amountOut` from quoter.
        // Then, calculate the expected `minAmountOut` after applying maximum slippage, and finally simulate again.
        let report: Report;
        switch (simulationMode) {
          case SimulationMode.FORGE: {
            const forgePath = getForgePath();
            report = await simulateShortcutOnForge(
              shortcut,
              chainId,
              script,
              amountsIn,
              tokensIn,
              tokensOut,
              { ...setterArgsBps, slippage: DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE },
              forgePath,
              rpcUrl,
              blockNumber || -1,
              roles,
              ShortcutExecutionMode.MULTICALL__AGGREGATE,
              { isReportLogged: false, isCalldataLogged: false },
            );
            break;
          }
          case SimulationMode.QUOTER: {
            report = await simulateShortcutOnQuoter(
              shortcut,
              chainId,
              script,
              amountsIn,
              tokensIn,
              tokensOut,
              { ...setterArgsBps, slippage: DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE },
              rpcUrl,
              roles,
              ShortcutExecutionMode.MULTICALL__AGGREGATE,
              { isReportLogged: false, isCalldataLogged: false },
            );
            break;
          }
          default:
            throw new Error(`Unsupported simulaton 'mode': ${simulationMode}. `);
        }

        const receiptTokenAddr = tokensOut[0]; // NB: Royco campaign shortcuts expect a single receipt token
        const amountOut = report.quote[receiptTokenAddr];
        minAmountOut = BigNumber.from(amountOut).mul(MAX_BPS.sub(setterArgsBps.slippage)).div(MAX_BPS);
      }
    }

    if (setterInputs.has('minAmount0Bps')) minAmount0Bps = setterArgsBps.minAmount0Bps;

    if (setterInputs.has('minAmount1Bps')) minAmount1Bps = setterArgsBps.minAmount1Bps;

    if (setterInputs.has('usdcToMintHoney')) {
      const usdcAmountIn = amountsIn[0]; // this assumes a single-sided deposit
      const island = shortcut.inputs[chainId].island; // assumes we are minting honey for a kodiak island
      if (!island) throw 'Error: Shortcut not supported for calculating usdc to mint';

      usdcToMintHoney = await getUsdcToMintHoney(provider, chainId, usdcAmountIn, island, setterArgsBps.skewRatio);
    }
  }

  return { minAmountOut, minAmount0Bps, minAmount1Bps, usdcToMintHoney };
}

export async function simulateShortcutOnQuoter(
  shortcut: Shortcut,
  chainId: ChainIds,
  script: WeirollScript,
  amountsIn: string[],
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  setterArgsBps: Record<string, BigNumber>,
  rpcUrl: string,
  roles: SimulationRoles,
  shortcutExecutionMode: ShortcutExecutionMode,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const { txData, reportPre } = await generateTxData(
    shortcut,
    chainId,
    script,
    amountsIn,
    tokensIn,
    tokensOut,
    setterArgsBps,
    rpcUrl,
    roles,
    shortcutExecutionMode,
    SimulationMode.QUOTER,
    simulationLogConfig,
  );

  const tx: APITransaction = {
    from: roles.caller.address!,
    to: roles.callee!.address!,
    data: txData,
    value: '0',
    receiver: roles.weirollWallet!.address,
    executor: roles.weirollWallet!.address,
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
    weirollWallet: getAddress(roles.weirollWallet!.address!),
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

export async function simulateShortcutOnForge(
  shortcut: Shortcut,
  chainId: ChainIds,
  script: WeirollScript,
  amountsIn: string[],
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  setterArgsBps: Record<string, BigNumber>,
  forgePath: string,
  rpcUrl: string,
  blockNumber: number,
  roles: SimulationRoles,
  shortcutExecutionMode: ShortcutExecutionMode,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const forgeContract = 'Simulation_Fork_Test';
  const forgeTest = 'test_simulateShortcut_1';
  const forgeTestRelativePath = 'test/foundry/fork/Simulation_Fork_Test.t.sol';
  const forgeContractABI = CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI;

  const { txData, reportPre } = await generateTxData(
    shortcut,
    chainId,
    script,
    amountsIn,
    tokensIn,
    tokensOut,
    setterArgsBps,
    rpcUrl,
    roles,
    shortcutExecutionMode,
    SimulationMode.FORGE,
    simulationLogConfig,
    blockNumber,
  );

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
  for (const command of script.commands) {
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
    weirollWallet: getAddress(roles.weirollWallet!.address!),
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

async function getUsdcToMintHoney(
  provider: StaticJsonRpcProvider,
  chainId: number,
  amountIn: BigNumberish,
  island: AddressArg,
  skewRatio: BigNumber,
): Promise<BigNumber> {
  // TODO: generalize to other islands that support honey? ensure the correct token order?
  const usdcPrecision = BigNumber.from('1000000');
  const honey = chainIdToDeFiAddresses[chainId]!.honey!;
  const { token0, token1 } = await getIslandTokens(provider, island);
  if (!isAddressEqual(token0, honey) && !isAddressEqual(token1, honey)) throw 'Error: Honey is not on this island';
  const zeroToOne = isAddressEqual(token0, honey);
  const pair = zeroToOne ? token1 : token0;
  const pairExchangeRate = usdcExchangeRates[chainId][pair];
  if (!pairExchangeRate) throw 'Error: Pair exchange rate cannot be found';

  const honeyExchangeRate = await getHoneyExchangeRate(provider, chainId, chainIdToDeFiAddresses[chainId]!.usdc);
  // test 50/50 split
  const halfAmountIn = BigNumber.from(amountIn).div(2);
  const honeyMintAmount = halfAmountIn.mul(honeyExchangeRate).div(usdcPrecision); // div by usdc decimals precision
  const pairAmount = halfAmountIn.mul(pairExchangeRate).div(usdcPrecision); // div by usdc decimals precision
  // calculate min
  const islandMintAmounts = await getIslandMintAmounts(
    provider,
    island,
    zeroToOne
      ? [honeyMintAmount.toString(), pairAmount.toString()]
      : [pairAmount.toString(), honeyMintAmount.toString()],
  );
  const { amount0, amount1 } = islandMintAmounts;
  // recalculate using the known ratio between amount0 and amount1
  const honeyWithPrecision = zeroToOne ? amount0.mul(PRECISION) : amount1.mul(PRECISION);
  const pairWithPrecision = zeroToOne ? amount1.mul(PRECISION) : amount0.mul(PRECISION);

  const relativeUsdcInHoneyWithPrecision = honeyWithPrecision.mul(usdcPrecision).div(honeyExchangeRate);
  const relativeUsdcInPairWithPrecision = pairWithPrecision.mul(usdcPrecision).div(pairExchangeRate);
  const totalUsdcWithPrecision = relativeUsdcInPairWithPrecision.add(relativeUsdcInHoneyWithPrecision);

  // Calculate the relative pair usdc amount and the subtract is from the amountIn to get honey. With this approach any rounding favours honey
  const relativeUsdc = BigNumber.from(amountIn).mul(relativeUsdcInPairWithPrecision).div(totalUsdcWithPrecision);
  const usdcToMintHoney = BigNumber.from(amountIn).sub(relativeUsdc);
  return usdcToMintHoney.mul(skewRatio).div(MAX_BPS);
}

async function generateTxData(
  shortcut: Shortcut,
  chainId: ChainIds,
  script: WeirollScript,
  amountsIn: string[],
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  setterArgsBps: Record<string, BigNumber>,
  rpcUrl: string,
  roles: SimulationRoles,
  shortcutExecutionMode: ShortcutExecutionMode,
  simulationMode: SimulationMode,
  simulationLogConfig: SimulationLogConfig,
  blockNumber?: number,
): Promise<{
  txData: string;
  reportPre: Partial<Report>;
}> {
  const { commands, state } = script;

  const reportPre: Partial<Report> = {};
  let txData: string;
  switch (shortcutExecutionMode) {
    case ShortcutExecutionMode.MULTICALL__AGGREGATE: {
      const setters = await getSetters(
        shortcut,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        setterArgsBps,
        rpcUrl,
        roles,
        simulationMode,
        blockNumber,
      );
      if (setters.minAmountOut) {
        reportPre.minAmountOut = setters.minAmountOut.toString();
        reportPre.minAmountOutHex = setters.minAmountOut.toHexString();
      }
      const { setterData, setterInputData } = await generateSetterCallData(
        shortcut.setterInputs![chainId],
        roles.setter.address!,
        setters,
      );

      const provider = new StaticJsonRpcProvider(rpcUrl);
      const wallet = await getNextWeirollWalletFromMockRecipeMarketHub(provider, roles.recipeMarketHub.address!);
      roles.weirollWallet = { address: wallet, label: 'WeirollWallet' };
      roles.callee = roles.multiCall;

      // can call executeWeiroll on recipeMarketHub it will automatically deploy a weiroll wallet
      const weirollData = getEncodedData(commands, state);
      const calls: [AddressArg, string][] = [...setterData, [roles.recipeMarketHub.address!, weirollData]];
      txData = encodeMulticall(calls);

      if (simulationLogConfig.isCalldataLogged) {
        console.log('Simulation (setter data):\n', setterInputData, '\n');
        console.log('Simulation (setter calldata):\n', setterData, '\n');
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
  return { txData, reportPre };
}

async function getNextWeirollWalletFromMockRecipeMarketHub(
  provider: StaticJsonRpcProvider,
  mockRecipeMarketHub: AddressArg,
): Promise<AddressArg> {
  const weirollWalletBytes = await provider.call({
    to: mockRecipeMarketHub,
    data: recipeMarketHubInterface.encodeFunctionData('createCampaign', [0]),
  });

  return `0x${weirollWalletBytes.slice(26)}`;
}
