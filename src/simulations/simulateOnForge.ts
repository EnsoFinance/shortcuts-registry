import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { spawnSync } from 'node:child_process';

export function simulateTransactionOnForge(
  commands: string[],
  state: string[],
  value: string,
  tokensIn: string[],
  amountsIn: string[],
  tokensInHolders: Set<AddressArg>,
  tokensOut: string[],
  tokensDust: Set<AddressArg>,
  addressToLabel: Map<string, string>,
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
  spawnSync('forge', ['test', '--match-contract', 'EnsoWeirollWallet_Fork_Cartio_Test', '-vvv'], {
    encoding: 'utf-8',
    env: {
      PATH: `${process.env.PATH}:${forgePath}"`,
      SIMULATION_CHAIN_ID: chainId.toString(),
      SIMULATION_RPC_URL: rpcUrl,
      SIMULATION_BLOCK_NUMBER: blockNumber.toString(),
      SIMULATION_JSON_CALLDATA: JSON.stringify({
        commands,
        state,
        value,
        tokensIn,
        amountsIn,
        tokensInHolders: [...tokensInHolders],
        tokensOut,
        tokensDust: [...tokensDust],
        labelKeys: [...addressToLabel.keys()],
        labelValues: [...addressToLabel.values()],
      }),
      TERM: process.env.TER || 'xterm-256color',
      FORCE_COLOR: '1',
    },
    stdio: 'inherit',
  });
}
