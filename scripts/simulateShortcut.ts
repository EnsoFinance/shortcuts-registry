import { BigNumber } from '@ethersproject/bignumber';

import {
  DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
  MAX_BPS,
  MIN_BPS,
  ShortcutExecutionMode,
  SimulationMode,
} from '../src/constants';
import {
  getAmountsInFromArgs,
  getBasisPointsFromArgs,
  getBlockNumberFromArgs,
  getForgePath,
  getIsCalldataLoggedFromArgs,
  getRpcUrlByChainId,
  getShortcut,
  getShortcutExecutionMode,
  getSimulationModeFromArgs,
  getSimulationRolesByChainId,
} from '../src/helpers';
import { simulateShortcutOnForge, simulateShortcutOnQuoter } from '../src/helpers/simulate';
import type { Report } from '../src/types';

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

  if ([ShortcutExecutionMode.MULTICALL__AGGREGATE].includes(shortcutExecutionMode)) {
    // adjust default values with user inputted values
    Object.keys(setterArgsBps).forEach((key) => {
      setterArgsBps[key] = getBasisPointsFromArgs(args, key, setterArgsBps[key].toString());
    });
  }

  let report: Report;
  switch (simulatonMode) {
    case SimulationMode.FORGE: {
      const forgePath = getForgePath();
      report = await simulateShortcutOnForge(
        shortcut,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        setterArgsBps,
        forgePath,
        rpcUrl,
        blockNumber,
        roles,
        shortcutExecutionMode,
        simulationLogConfig,
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
        setterArgsBps,
        rpcUrl,
        roles,
        shortcutExecutionMode,
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
