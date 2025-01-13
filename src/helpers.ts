import { getChainName } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { isNullAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface, defaultAbiCoder } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

import {
  DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
  MAX_BPS,
  PRECISION,
  ShortcutExecutionMode,
  ShortcutOutputFormat,
  SimulationMode,
  chainIdToDeFiAddresses,
  chainIdToSimulationRoles,
} from '../src/constants';
import { Shortcut } from '../src/types';
import { AbracadabraMimHoneyhortcut } from './shortcuts/abracadabra/mim-honey';
import { BeraborrowNectHoneyShortcut } from './shortcuts/beraborrow/nect-honey';
import { BeraborrowSbtcShortcut } from './shortcuts/beraborrow/sbtc';
import { BeraborrowWethShortcut } from './shortcuts/beraborrow/weth';
import { BurrbearUsdcShortcut } from './shortcuts/burrbear/usdc';
import { ConcreteUsdcShortcut } from './shortcuts/concrete/usdc';
import { ConcreteWethShortcut } from './shortcuts/concrete/weth';
import { D2UsdcShortcut } from './shortcuts/d2/usdc';
import { DahliaUsdcShortcut } from './shortcuts/dahlia/usdc';
import { DahliaWethShortcut } from './shortcuts/dahlia/weth';
import { DolomiteDEthShortcut } from './shortcuts/dolomite/deth';
import { DolomiteDHoneyShortcut } from './shortcuts/dolomite/dhoney';
import { DolomiteDPumpBtcShortcut } from './shortcuts/dolomite/dpumpbtc';
import { DolomiteDRsEthShortcut } from './shortcuts/dolomite/drseth';
import { DolomiteDSbtcShortcut } from './shortcuts/dolomite/dsbtc';
import { DolomiteDUsdcShortcut } from './shortcuts/dolomite/dusdc';
import { DolomiteDUsdtShortcut } from './shortcuts/dolomite/dusdt';
import { DolomiteDWbtcShortcut } from './shortcuts/dolomite/dwbtc';
import { DolomiteDYlPumpBtcShortcut } from './shortcuts/dolomite/dylpumpbtc';
import { InfraredWethWbtcShortcut } from './shortcuts/infrared/weth-wbtc';
import { KodiakHoneyUsdcShortcut } from './shortcuts/kodiak/honey-usdc';
import { KodiakHoneyWethShortcut } from './shortcuts/kodiak/honey-weth';
import { KodiakWethWbtcShortcut } from './shortcuts/kodiak/weth-wbtc';
import { MobySpvUsdcShortcut } from './shortcuts/moby/spv-usdc';
import { MobyWolpHoneyShortcut } from './shortcuts/moby/wolp-honey';
import { MobyWolpUsdcShortcut } from './shortcuts/moby/wolp-usdc';
import { MobyWolpWbtcShortcut } from './shortcuts/moby/wolp-wbtc';
import { MobyWolpWethShortcut } from './shortcuts/moby/wolp-weth';
import { OrigamiBoycoHoneyShortcut } from './shortcuts/origami/oboy-HONEY-a';
import { SatlayerPumpBtcShortcut } from './shortcuts/satlayer/pumpbtc';
import { ThjUsdcShortcut } from './shortcuts/thj/usdc';
import type { Campaign, SimulationRoles } from './types';

dotenv.config();

export const shortcuts: Record<string, Record<string, Shortcut>> = {
  abracadabra: {
    'honey-mim': new AbracadabraMimHoneyhortcut(),
  },
  beraborrow: {
    'nect-honey': new BeraborrowNectHoneyShortcut(),
    sbtc: new BeraborrowSbtcShortcut(),
    weth: new BeraborrowWethShortcut(),
  },
  burrbear: {
    usdc: new BurrbearUsdcShortcut(),
  },
  concrete: {
    usdc: new ConcreteUsdcShortcut(),
    weth: new ConcreteWethShortcut(),
    wbtc: new ConcreteWethShortcut(),
  },
  dahlia: {
    usdc: new DahliaUsdcShortcut(),
    weth: new DahliaWethShortcut(),
  },
  dolomite: {
    deth: new DolomiteDEthShortcut(),
    dhoney: new DolomiteDHoneyShortcut(),
    dpumpbtc: new DolomiteDPumpBtcShortcut(),
    drseth: new DolomiteDRsEthShortcut(),
    dsbtc: new DolomiteDSbtcShortcut(),
    dusdc: new DolomiteDUsdcShortcut(),
    dusdt: new DolomiteDUsdtShortcut(),
    dwbtc: new DolomiteDWbtcShortcut(),
    dylpumpbtc: new DolomiteDYlPumpBtcShortcut(),
  },

  d2: {
    usdc: new D2UsdcShortcut(),
  },
  // TODO: uncomment out and move import up once Goldilocks is ready
  // import { GoldilocksEbtcShortcut } from './shortcuts/goldilocks/ebtc';
  // goldilocks: {
  //   ebtc: new GoldilocksEbtcShortcut(),
  // },
  kodiak: {
    'honey-usdc': new KodiakHoneyUsdcShortcut(),
    'honey-weth': new KodiakHoneyWethShortcut(),
    'weth-wbtc': new KodiakWethWbtcShortcut(),
  },
  moby: {
    'wolp-honey': new MobyWolpHoneyShortcut(),
    'wolp-usdc': new MobyWolpUsdcShortcut(),
    'wolp-wbtc': new MobyWolpWbtcShortcut(),
    'wolp-weth': new MobyWolpWethShortcut(),
    'spv-usdc': new MobySpvUsdcShortcut(),
  },
  origami: {
    'oboy-honey': new OrigamiBoycoHoneyShortcut(),
  },
  satlayer: {
    pumpbtc: new SatlayerPumpBtcShortcut(),
  },
  infrared: {
    'weth-wbtc': new InfraredWethWbtcShortcut(),
  },
  thj: {
    usdc: new ThjUsdcShortcut(),
  },
};

export async function getShortcut(args: string[]) {
  if (args.length < 3) throw 'Error: Please pass chain, protocol, and market';
  const chain = args[0];
  const protocol = args[1];
  const market = args[2];

  const chainId = getChainId(chain);
  if (!chainId) throw 'Error: Unknown chain';

  const shortcut = shortcuts[protocol]?.[market];
  if (!shortcut) throw 'Error: Unknown shortcut';

  return { shortcut, chainId };
}

export function getShortcutExecutionMode(shortcut: Shortcut, chainId: number): ShortcutExecutionMode {
  if (shortcut.setterInputs?.[chainId]) {
    return ShortcutExecutionMode.MULTICALL__AGGREGATE;
  }

  return ShortcutExecutionMode.WEIROLL_WALLET__EXECUTE_WEIROLL;
}

export function getChainId(chainName: string) {
  chainName = chainName.toLowerCase(); // ensure consistent
  const key = (chainName.charAt(0).toUpperCase() + chainName.slice(1)) as keyof typeof ChainIds;
  return ChainIds[key];
}

export function getRpcUrlByChainId(chainId: number): string {
  const chainName = getChainName(chainId);

  const rpcUrl = process.env[`RPC_URL_${chainName.toUpperCase()}`];
  if (!rpcUrl) throw new Error(`Missing 'RPC_URL_${chainName.toUpperCase()}' environment variable`);

  return rpcUrl;
}

export function getSimulationRolesByChainId(chainId: number): SimulationRoles {
  const roles = chainIdToSimulationRoles.get(chainId);
  if (!roles)
    throw new Error(
      `Missing simulation roles for 'chainId': ${chainId}. Please, update 'chainIdToSimulationRoles' map`,
    );

  return roles;
}

export function getForgePath(): string {
  const forgePath = execSync('which forge', { encoding: 'utf-8' }).trim();
  if (!forgePath) {
    throw new Error(
      `missing 'forge' binary on the system. Make sure 'foundry' is properly installed  (test it via '$ which forge')`,
    );
  }
  return forgePath;
}

export function getSimulationModeFromArgs(args: string[]): SimulationMode {
  const simulationModeIdx = args.findIndex((arg) => arg.startsWith('--mode='));
  let simulationMode: SimulationMode;
  if (simulationModeIdx === -1) {
    simulationMode = SimulationMode.QUOTER;
  } else {
    simulationMode = args[simulationModeIdx].split('=')[1] as SimulationMode;
    args.splice(simulationModeIdx, 1);
  }
  return simulationMode;
}

export function getBlockNumberFromArgs(args: string[]): number {
  const blockNumberIdx = args.findIndex((arg) => arg.startsWith('--block='));
  let blockNumber: number;
  if (blockNumberIdx === -1) {
    blockNumber = blockNumberIdx;
  } else {
    blockNumber = parseInt(args[blockNumberIdx].split('=')[1]);
    args.splice(blockNumberIdx, 1);
  }

  return blockNumber;
}

export function getPrivateKeyFromArgs(args: string[]): string {
  const privateKeyIdx = args.findIndex((arg) => arg.startsWith('--privateKey='));
  let privateKey: string;
  if (privateKeyIdx === -1) {
    // get env variable
    privateKey = process.env.PRIVATE_KEY as string;
    if (!privateKey) throw 'Error: Env variable not found';
  } else {
    privateKey = args[privateKeyIdx].split('=')[1];
    args.splice(privateKeyIdx, 1);
  }

  return privateKey;
}

export function getShortcutOutputFormatFromArgs(args: string[]): string {
  const outputFmtIdx = args.findIndex((arg) => arg.startsWith('--output='));
  let outputFmt: string;
  if (outputFmtIdx === -1) {
    outputFmt = ShortcutOutputFormat.ROYCO;
  } else {
    outputFmt = args[outputFmtIdx].split('=')[1] as ShortcutOutputFormat;
    args.splice(outputFmtIdx, 1);
  }

  return outputFmt;
}

export function getAmountsInFromArgs(args: string[]): string[] {
  const filteredArg = args[5];
  if (!filteredArg || !filteredArg.length) throw 'Error: Please pass amounts (use commas for multiple values)';

  return filteredArg.split(',');
}

export function getBasisPointsFromArgs(args: string[], label: string, defaultVal: string): BigNumber {
  const idx = args.findIndex((arg) => arg.startsWith(`--${label}=`));
  let raw: string;
  if (idx === -1) {
    raw = defaultVal;
  } else {
    raw = args[idx].split('=')[1] as ShortcutOutputFormat;
    args.splice(idx, 1);
  }

  let value: BigNumber;
  try {
    value = BigNumber.from(raw);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${raw}. Required a BigNumber type as BIPS. Reason: ${error}`);
  }

  if (value.lt(DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE) || value.gt(MAX_BPS)) {
    throw new Error(
      `invalid ${label}: ${raw}. BIPS is out of range [${DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE.toString()},${MAX_BPS.toString()}]`,
    );
  }

  return value;
}

export function getIsCalldataLoggedFromArgs(args: string[]): boolean {
  const logCalldataIdx = args.findIndex((arg) => arg.startsWith('--calldata'));
  let isCalldataLogged: boolean;
  if (logCalldataIdx === -1) {
    isCalldataLogged = false;
  } else {
    isCalldataLogged = true;
    args.splice(logCalldataIdx, 1);
  }

  return isCalldataLogged;
}

export function getWalletFromArgs(args: string[]): string {
  const filteredArgs = args.slice(5);
  if (filteredArgs.length != 1) throw 'Error: Please pass wallet address';

  const address = filteredArgs[0];

  if (!address.startsWith('0x') || address.length !== 42) throw 'Error: Invalid address';

  return address;
}

export function getEncodedData(commands: string[], state: string[]): string {
  const weirollWalletInterface = new Interface([
    'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
  ]);
  return weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
}

export function buildVerificationHash(script: WeirollScript, receiptToken: AddressArg, inputTokens: AddressArg[]) {
  // TODO: confirm token order for encoding hash
  return keccak256(
    defaultAbiCoder.encode(
      ['address[]', 'address', 'tuple(bytes32[], bytes[])'],
      [inputTokens, receiptToken, [script.commands, script.state]],
    ),
  );
}

export async function getUsdcToMintHoney(
  provider: StaticJsonRpcProvider,
  chainId: number,
  amountIn: BigNumberish,
  island: AddressArg,
  skewRatio: BigNumber,
): Promise<BigNumber> {
  // TODO: generalize to other islands that support honey? ensure the correct token order?

  const honeyExchangeRate = await getHoneyExchangeRate(provider, chainId, chainIdToDeFiAddresses[chainId]!.usdc);
  // test 50/50 split
  const halfAmountIn = BigNumber.from(amountIn).div(2);
  const honeyMintAmount = halfAmountIn.mul(honeyExchangeRate).div('1000000'); // div by usdc decimals precision
  // calculate min
  const islandMintAmounts = await getIslandMintAmounts(provider, island, [
    halfAmountIn.toString(),
    honeyMintAmount.toString(),
  ]);
  const { amount0, amount1 } = islandMintAmounts;
  // recalculate using the known ratio between amount0 and amount1
  const usdcWithPrecision = amount0.mul(PRECISION);
  const honeyWithPrecision = amount1.mul(PRECISION);

  const totalUsdcWithPrecision = usdcWithPrecision.add(honeyWithPrecision.mul('1000000').div(honeyExchangeRate));
  const relativeUsdc = BigNumber.from(amountIn).mul(usdcWithPrecision).div(totalUsdcWithPrecision);
  return BigNumber.from(amountIn).sub(relativeUsdc).mul(skewRatio).div(MAX_BPS);
}

export async function getHoneyExchangeRate(
  provider: StaticJsonRpcProvider,
  chainId: number,
  underlyingToken: AddressArg,
): Promise<BigNumber> {
  const honeyFactoryInterface = new Interface(['function mintRates(address) external view returns (uint256)']);
  const honeyFactory = chainIdToDeFiAddresses[chainId]!.honeyFactory;
  const data = await provider.call({
    to: honeyFactory,
    data: honeyFactoryInterface.encodeFunctionData('mintRates', [underlyingToken]),
  });
  return honeyFactoryInterface.decodeFunctionResult('mintRates', data)[0] as BigNumber;
}

export async function getIslandMintAmounts(
  provider: StaticJsonRpcProvider,
  island: AddressArg,
  amounts: string[],
): Promise<{ amount0: BigNumber; amount1: BigNumber; mintAmount: BigNumber }> {
  const islandInterface = new Interface([
    'function getMintAmounts(uint256, uint256) external view returns (uint256 amount0, uint256 amount1, uint256 mintAmount)',
  ]);
  const data = await provider.call({
    to: island,
    data: islandInterface.encodeFunctionData('getMintAmounts', amounts),
  });
  const mintAmounts = islandInterface.decodeFunctionResult('getMintAmounts', data);
  return {
    amount0: mintAmounts.amount0,
    amount1: mintAmounts.amount1,
    mintAmount: mintAmounts.mintAmount,
  };
}

export async function getCampaignVerificationHash(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<string> {
  const depositExecutorInterface = new Interface([
    'function getCampaignVerificationHash(bytes32 marketHash) external view returns (bytes32 verificationHash)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  const data = await provider.call({
    to: roles.depositExecutor.address,
    data: depositExecutorInterface.encodeFunctionData('getCampaignVerificationHash', [marketHash]),
  });
  return depositExecutorInterface.decodeFunctionResult('getCampaignVerificationHash', data).verificationHash as string;
}

export async function getCampaign(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<Campaign> {
  const depositExecutorInterface = new Interface([
    'function sourceMarketHashToDepositCampaign(bytes32 marketHash) external view returns (address owner, bool verified, uint8 numInputTokens, address receiptToken, uint256 unlockTimestamp, tuple(bytes32[] commands, bytes[] state) depositRecipe)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  const data = await provider.call({
    to: roles.depositExecutor.address,
    data: depositExecutorInterface.encodeFunctionData('sourceMarketHashToDepositCampaign', [marketHash]),
  });
  return depositExecutorInterface.decodeFunctionResult(
    'sourceMarketHashToDepositCampaign',
    data,
  ) as unknown as Campaign;
}

export async function getWeirollWallets(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<AddressArg[]> {
  const depositExecutorInterface = new Interface([
    'function getWeirollWalletByCcdmNonce(bytes32 marketHash, uint256 ccdmNonce) external view returns (address wallet)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);

  const wallets: AddressArg[] = [];
  let foundLastWallet = false;
  while (!foundLastWallet) {
    const data = await provider.call({
      to: roles.depositExecutor.address,
      data: depositExecutorInterface.encodeFunctionData('getWeirollWalletByCcdmNonce', [
        marketHash,
        wallets.length + 1,
      ]),
    });
    const { wallet } = depositExecutorInterface.decodeFunctionResult('getWeirollWalletByCcdmNonce', data);
    if (!isNullAddress(wallet)) {
      wallets.push(wallet as AddressArg);
    } else {
      foundLastWallet = true;
    }
  }
  return wallets;
}

export async function buildShortcutsHashMap(chainId: number): Promise<Record<string, Shortcut>> {
  const shortcutsArray = [];
  for (const protocol in shortcuts) {
    for (const market in shortcuts[protocol]) {
      shortcutsArray.push(shortcuts[protocol][market]);
    }
  }
  const hashArray = await Promise.all(
    shortcutsArray.map(async (shortcut) => {
      const { script, metadata } = await shortcut.build(chainId);
      return buildVerificationHash(script, metadata.tokensOut![0], []);
    }),
  );
  const shortcutsHashMap: Record<string, Shortcut> = {};
  for (const i in shortcutsArray) {
    shortcutsHashMap[hashArray[i]] = shortcutsArray[i];
  }
  return shortcutsHashMap;
}

export function hashContent(content: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
