import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { spawnSync } from 'node:child_process';

import { SimulationMode } from '../src/constants';
import { getShortcut } from '../src/helpers';
import {
    getAmountsInFromArgs,
    getBlockNumberFromArgs,
    getRpcUrlByChainId,
    getSimulationModeFromArgs,
    validateAndGetForgePath,
} from '../src/helpers';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import { Shortcut } from '../src/types';

const weirollWalletInterface = new Interface([
    'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

const fromAddress = '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11';
const weirollWalletAddress = '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736';

type SimulationReport = {
    quote: Record<string, string>;
    dust: Record<string, string>;
    gas: string;
};

async function simulateShortcutOnQuoter(
  shortcut: Shortcut,
  chainId: ChainIds,
  amountsIn: string[]
): Promise<void> {
  const { script, metadata } = await shortcut.build(chainId);

  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata';
  if (amountsIn.length != tokensIn.length) throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;

  const { commands, state, value } = script;
  const data = weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
  const tx: APITransaction = {
      from: fromAddress,
      to: weirollWalletAddress,
      data,
      value,
      receiver: weirollWalletAddress,
  }
  const quoteTokens = [...tokensOut, ...tokensIn]; //find dust
  const request: QuoteRequest = {
      chainId,
      transactions: [tx],
      tokenIn: tokensIn,
      tokenOut: quoteTokens,
      amountIn: amountsIn,
  }
  
  const quote = (await simulateTransactionOnQuoter(request))[0];
  if (quote.status === 'Error') throw quote.error;
  const report: SimulationReport = {
      quote: {},
      dust: {},
      gas: quote.gas,
  }
  tokensOut.forEach(t => {
      const index = quoteTokens.findIndex(q => q === t);
      report.quote[t] = quote.amountOut[index];
  });
  tokensIn.forEach(t => {
      const index = quoteTokens.findIndex(q => q === t);
      report.dust[t] = quote.amountOut[index];
  })
  console.log('Simulation: ', report);
}

async function simulateOnForge(shortcut: Shortcut, chainId: ChainIds, blockNumber: number): Promise<void> {
    const { commands, state, value } = await shortcut.build(chainId);

    const forgePath = validateAndGetForgePath();

    // NB: read `result.stdout` instead of writing it in a JSON file
    // NB: calling forge with `-vvv` instead of `-vvvv` to avoid too much verbosity (i.e. `setUp` steps)
    spawnSync('forge', ['test', '--match-contract', 'EnsoWeirollWallet_Fork_Cartio_Test', '-vvv'], {
        encoding: 'utf-8',
        env: {
            PATH: `${process.env.PATH}:${forgePath}"`,
            SIMULATION_CHAIN_ID: chainId.toString(),
            SIMULATION_RPC_URL: process.env[`RPC_URL_${getRpcUrlByChainId(chainId)}`],
            SIMULATION_BLOCK_NUMBER: blockNumber.toString(),
            SIMULATION_JSON_CALLDATA: JSON.stringify({ commands, state, value }),
            TERM: process.env.TER || 'xterm-256color',
            FORCE_COLOR: '1',
        },
        stdio: 'inherit',
    });
}

async function main() {
    try {
        const { shortcut, chainId } = await getShortcut();

        const args: string[] = process.argv;
        const simulatonMode = getSimulationModeFromArgs(args);

        switch (simulatonMode) {
            case SimulationMode.FORGE: {
                const blockNumber = getBlockNumberFromArgs(args);
                await simulateOnForge(shortcut, chainId, blockNumber);
                break;
            }
            case SimulationMode.QUOTER: {
                const amountsIn = getAmountsInFromArgs(args);
                await simulateShortcutOnQuoter(shortcut, chainId, amountsIn);
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
