import { getChainName } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

import { ShortcutOutputFormat, SimulationMode, chainIdToSimulationRoles } from '../src/constants';
import { Shortcut } from '../src/types';
import { AbracadabraHoneyMimShortcut } from './shortcuts/abracadabra/honey-mim';
import { BeraborrowMintNectLpShortcut } from './shortcuts/beraborrow/mint-nect-lp';
import { BeraborrowVaultStrategyShortcut } from './shortcuts/beraborrow/vault-strategy';
import { DolomiteDEthShortcut } from './shortcuts/dolomite/deth';
import { DolomiteDHoneyShortcut } from './shortcuts/dolomite/dhoney';
import { DolomiteDUsdcShortcut } from './shortcuts/dolomite/dusdc';
import { DolomiteDUsdtShortcut } from './shortcuts/dolomite/dusdt';
import { DolomiteDWbtcShortcut } from './shortcuts/dolomite/dwbtc';
import { KodiakHoneyUsdcShortcut } from './shortcuts/kodiak/honey-usdc';
import { KodiakHoneyWethShortcut } from './shortcuts/kodiak/honey-weth';
import { KodiakWethWbtcShortcut } from './shortcuts/kodiak/weth-wbtc';
import { MobyWolpHoneyShortcut } from './shortcuts/moby-olp/wolp-honey';
import { MobyWolpUsdcShortcut } from './shortcuts/moby-olp/wolp-usdc';
import { MobyWolpWbtcShortcut } from './shortcuts/moby-olp/wolp-wbtc';
import { MobyWolpWethShortcut } from './shortcuts/moby-olp/wolp-weth';
import { MobySpvUsdcHoneyShortcut } from './shortcuts/moby-spv/usdc-honey';
import { OrigamiBoycoHoneyShortcut } from './shortcuts/origami/oboy-HONEY-a';
import { SatlayerPumpBtcShortcut } from './shortcuts/satlayer/pumpbtc';
import type { SimulationRoles } from './types';

dotenv.config();

const shortcuts: Record<string, Record<string, Shortcut>> = {
  abracadabra: {
    'honey-mim': new AbracadabraHoneyMimShortcut(),
  },
  beraborrow: {
    'mint-nect-lp': new BeraborrowMintNectLpShortcut(),
    'vault-strategy': new BeraborrowVaultStrategyShortcut(),
  },
  dolomite: {
    deth: new DolomiteDEthShortcut(),
    dhoney: new DolomiteDHoneyShortcut(),
    dusdc: new DolomiteDUsdcShortcut(),
    dusdt: new DolomiteDUsdtShortcut(),
    dwbtc: new DolomiteDWbtcShortcut(),
  },
  // TODO: uncomment out and move import up once Goldilocks is ready
  // import { GoldilocksEbtcShortcut } from './shortcuts/goldilocks/ebtc-vault';
  // goldilocks: {
  //   ebtc: new GoldilocksEbtcShortcut(),
  // },
  kodiak: {
    'honey-usdc': new KodiakHoneyUsdcShortcut(),
    'honey-weth': new KodiakHoneyWethShortcut(),
    'weth-wbtc': new KodiakWethWbtcShortcut(),
  },
  mobyOlp: {
    'wolp-honey': new MobyWolpHoneyShortcut(),
    'wolp-usdc': new MobyWolpUsdcShortcut(),
    'wolp-wbtc': new MobyWolpWbtcShortcut(),
    'wolp-weth': new MobyWolpWethShortcut(),
  },
  mobySpv: {
    'usdc-honey': new MobySpvUsdcHoneyShortcut(),
  },
  origami: {
    'oboy-honey': new OrigamiBoycoHoneyShortcut(),
  },
  satlayer: {
    pumpbtc: new SatlayerPumpBtcShortcut(),
  },
};

export async function getShortcut() {
  const args: string[] = process.argv.slice(2);

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

function getChainId(chainName: string) {
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
  const filteredArgs = args.slice(5);
  if (filteredArgs.length != 1) throw 'Error: Please pass amounts (use commas for multiple values)';

  return filteredArgs[0].split(',');
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
