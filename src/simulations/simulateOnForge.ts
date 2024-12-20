import type { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { spawnSync } from 'node:child_process';

import type { SimulationRoles, SimulationTokensData } from '../types';

export function simulateTransactionOnForge(
  roles: SimulationRoles,
  txData: string,
  tokensData: SimulationTokensData,
  addressToLabel: Map<AddressArg, string>,
  forgePath: string,
  chainId: number,
  rpcUrl: string,
  blockNumber: number,
): void {
  // NB: `spawnSync` forge call return can optionally be read from both `return.stdout` and `return.stderr`, and processed.
  // NB: calling forge with `--json` will print the deployment information as JSON.
  // NB: calling forge with `--gas-report` will print the gas report.
  // NB: calling forge with `-vvv` prevents too much verbosity (i.e. `setUp` steps), but hides traces from successful
  // tests. To make visible successful test traces, use `-vvvv`.
  spawnSync('forge', ['test', '--match-contract', 'MultiCall_Fork_Cartio_Test', '-vvv'], {
    encoding: 'utf-8',
    env: {
      PATH: `${process.env.PATH}:${forgePath}"`,
      SIMULATION_JSON_DATA: JSON.stringify({
        chainId,
        rpcUrl,
        blockNumber: blockNumber.toString(),
        caller: roles.caller.address,
        recipeMarketHub: roles.recipeMarketHub.address,
        multiCall: roles.multiCall.address,
        weirollWallet: roles.weirollWallet!.address,
        txData,
        tokensIn: tokensData.tokensIn,
        tokensInHolders: tokensData.tokensInHolders,
        amountsIn: tokensData.amountsIn,
        tokensOut: tokensData.tokensOut,
        tokensDust: tokensData.tokensDust,
        labelKeys: [...addressToLabel.keys()],
        labelValues: [...addressToLabel.values()],
      }),
      TERM: process.env.TER || 'xterm-256color',
      FORCE_COLOR: '1',
    },
    stdio: 'inherit',
  });
}
