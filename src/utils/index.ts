import { Builder } from '@ensofinance/shortcuts-builder';
import { contractCall, walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import {
  AddressArg,
  ChainIds,
  FromContractCallArg,
  NumberArg,
  Transaction,
  WalletAddressArg,
} from '@ensofinance/shortcuts-builder/types';
import { PUBLIC_RPC_URLS, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { addAction, areAddressesEqual, percentMul, resetApprovals } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { chainIdToDeFiAddresses } from '../constants';
import type { RoycoOutput, Shortcut, SimulationResult } from '../types';

export async function prepareResponse(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  simulationResult: any,
  transaction: Transaction,
): Promise<SimulationResult> {
  return {
    logs: simulationResult.logs,
    simulationURL: simulationResult.simulationURL,
    transaction,
  };
}

export function balanceOf(token: AddressArg, owner: WalletAddressArg) {
  return contractCall({
    address: token,
    functionName: 'balanceOf',
    abi: ['function balanceOf(address) external view returns (uint256)'],
    args: [owner],
  });
}

export async function mintHoney(asset: AddressArg, amount: NumberArg, builder: Builder) {
  const berachainHoney = getStandardByProtocol('berachain-honey', builder.chainId);
  const { honey, honeyFactory } = chainIdToDeFiAddresses[builder.chainId];

  const { amountOut } = await berachainHoney.deposit.addToBuilder(builder, {
    tokenIn: asset,
    tokenOut: honey,
    amountIn: amount,
    primaryAddress: honeyFactory,
  });

  return amountOut as FromContractCallArg;
}

export async function redeemHoney(asset: AddressArg, amount: NumberArg, builder: Builder) {
  const berachainHoney = getStandardByProtocol('berachain-honey', builder.chainId);
  const { honey, honeyFactory } = chainIdToDeFiAddresses[builder.chainId];

  const { amountOut } = await berachainHoney.redeem.addToBuilder(builder, {
    tokenIn: honey,
    tokenOut: asset,
    amountIn: amount,
    primaryAddress: honeyFactory,
  });

  return amountOut as FromContractCallArg;
}

export async function depositKodiak(
  builder: Builder,
  tokensIn: AddressArg[],
  amountsIn: NumberArg[],
  island: AddressArg,
  primary: AddressArg,
  setter: AddressArg,
  setterInputs: Set<string>,
  setMinAmount: boolean,
) {
  const rpcUrl = PUBLIC_RPC_URLS[builder.chainId].rpcUrls.public;
  const provider = new StaticJsonRpcProvider(rpcUrl);
  const islandInterface = new Interface(['function token0() external view returns(address)']);
  const token0Bytes = await provider.call({
    to: island,
    data: islandInterface.encodeFunctionData('token0', []),
  });
  const token0 = '0x' + token0Bytes.slice(26);
  const [amount0, amount1] = areAddressesEqual(token0, tokensIn[0])
    ? [amountsIn[0], amountsIn[1]]
    : [amountsIn[1], amountsIn[0]];
  const approvals = {
    tokens: tokensIn,
    amounts: amountsIn,
    spender: primary,
  };
  const amount0Min = setMinAmount ? percentMul(amount0, 9900, builder) : 1;
  const amount1Min = setMinAmount ? percentMul(amount1, 9900, builder) : 1;
  const amountSharesMin = builder.add({
    address: setter,
    abi: ['function getValue(uint256 index) external view returns (uint256)'],
    functionName: 'getValue',
    args: [findPositionInSetterInputs(setterInputs, 'minAmountOut')],
  });
  addAction({
    builder,
    action: {
      address: primary,
      abi: [
        'function addLiquidity(address island, uint256 amount0Max, uint256 amount1Max, uint256 amount0Min, uint256 amount1Min, uint256 amountSharesMin, address receiver) returns (uint256 amount0, uint256 amount1, uint256 mintAmount)',
      ],
      functionName: 'addLiquidity',
      args: [island, amount0, amount1, amount0Min, amount1Min, amountSharesMin, walletAddress()],
    },
    approvals,
  });
  resetApprovals(builder, {
    tokens: tokensIn,
    spender: primary,
  });
}

export async function buildRoycoMarketShortcut(shortcut: Shortcut, chainId: ChainIds): Promise<RoycoOutput> {
  const output = await shortcut.build(chainId);

  return {
    weirollCommands: output.script.commands,
    weirollState: output.script.state,
  };
}

function findPositionInSetterInputs(set: Set<string>, item: string) {
  let index = 0;
  for (const value of set) {
    if (value === item) {
      return index;
    }
    index++;
  }
  throw new Error(`Missing input '${item}' in set: ${JSON.stringify(set)}`);
}
