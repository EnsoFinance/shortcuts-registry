import { Shortcut } from "../src/types";
import { ChainIds } from "@ensofinance/shortcuts-builder/types";
import { DolomiteDHoneyShortcut } from "./shortcuts/dolomite/dhoney";
import { KodiakHoneyUsdcShortcut } from "./shortcuts/kodiak/honey-usdc";
import { DolomiteDUsdcShortcut } from "./shortcuts/dolomite/dusdc";
import { DolomiteDEthShortcut } from "./shortcuts/dolomite/deth";
import { DolomiteDUsdtShortcut } from "./shortcuts/dolomite/dusdt";
import { DolomiteDWbtcShortcut } from "./shortcuts/dolomite/dwbtc";
import { OrigamiBoycoHoneyShortcut } from "./shortcuts/origami/oboy-HONEY-a";

import { SimulationMode } from "../src/constants";
import { execSync } from "node:child_process";


const shortcuts: Record<string, Record<string, Shortcut>> = {
  dolomite: {
    deth: new DolomiteDEthShortcut(),
    dhoney: new DolomiteDHoneyShortcut(),
    dusdc: new DolomiteDUsdcShortcut(),
    dusdt: new DolomiteDUsdtShortcut(),
    dwbtc: new DolomiteDWbtcShortcut(),
  },
  kodiak: {
    "honey-usdc": new KodiakHoneyUsdcShortcut(),
  },
  origami: {
    "oboy-honey": new OrigamiBoycoHoneyShortcut(),
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
  const chainName = Object.keys(ChainIds).find((key) => ChainIds[key as keyof typeof ChainIds] === chainId);
  if (!chainName) throw new Error(`Unsupported 'chainId': ${chainId}`);

  const rpcUrl = process.env[`RPC_URL_${chainName.toUpperCase()}`];
  if (!rpcUrl) throw new Error(`Missing 'RPC_URL_${chainName.toUpperCase()}' environment variable`);

  return rpcUrl;
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

export function getAmountsInFromArgs(args: string[]): string[] {
  const filteredArgs = args.slice(5);
  console.log('Filtered args: ', filteredArgs);
  if (filteredArgs.length != 1) throw 'Error: Please pass amounts (use commas for multiple values)';

  return filteredArgs[0].split(',');
}
