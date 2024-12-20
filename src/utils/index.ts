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
import { PUBLIC_RPC_URLS, Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import {
  addAction,
  areAddressesEqual,
  getAddress,
  percentMul,
  resetApprovals,
} from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import type { RoycoOutput, Shortcut, SimulationResult } from '../types';

export const addresses: Record<number, Record<string, AddressArg>> = {
  [ChainIds.Cartio]: {
    setter: '0x67D0B6e109b82B51706dC4D71B42Bf19CdFC8d1e',
    honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
    usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
    mim: getAddress(TokenAddresses.cartio.mim) as AddressArg,
    nect: getAddress(TokenAddresses.cartio.nect) as AddressArg,
    honeyFactory: Standards.Berachain_Honey.protocol.addresses!.cartio!.honeyFactory,
    kodiakRouter: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
  },
};

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
  const { honey, honeyFactory } = addresses[builder.chainId];

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
  const { honey, honeyFactory } = addresses[builder.chainId];

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
    abi: ['function getSingleValue() external view returns (uint256)'],
    functionName: 'getSingleValue',
    args: [],
  });
  await addAction({
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
  await resetApprovals(builder, {
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
