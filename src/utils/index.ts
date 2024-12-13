import { Builder } from '@ensofinance/shortcuts-builder';
import { contractCall } from '@ensofinance/shortcuts-builder/helpers';
import {
  AddressArg,
  FromContractCallArg,
  NumberArg,
  Transaction,
  WalletAddressArg,
} from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { SimulationResult } from '../types';

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
  const honey = getStandardByProtocol('berachain-honey', builder.chainId);
  const honeyFactory = Standards.Berachain_Honey.protocol.addresses!.cartio!.honeyFactory;

  const { amountOut } = await honey.deposit.addToBuilder(builder, {
    tokenIn: asset,
    tokenOut: TokenAddresses.cartio.honey,
    amountIn: amount,
    primaryAddress: honeyFactory,
  });

  return amountOut as FromContractCallArg;
}
