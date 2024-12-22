import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';
import { getForks } from '@ensofinance/shortcuts-standards/helpers';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';

import { chainIdToDeFiAddresses, chainIdToSimulationRoles, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

const { Cartio } = ChainIds;
const { bex } = getForks(Standards.Balancer_v2);

export class MobySpvUsdcHoneyShortcut implements Shortcut {
  name = 'mobySpv-honey-usdc';
  description = '';
  supportedChains = [Cartio];
  inputs: Record<number, Input> = {
    [Cartio]: {
      usdc: chainIdToDeFiAddresses[Cartio].usdc,
      honey: chainIdToDeFiAddresses[Cartio].honey,
      lp: '0xF7F214A9543c1153eF5DF2edCd839074615F248c',
      primary: bex!.cartio!.vault,
      balancerHelpers: bex!.cartio!.balancerHelpers,
      setter: chainIdToSimulationRoles.get(Cartio)!.setter.address!,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, lp } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [lp],
    });
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));
    const halfAmount = div(amountIn, 2, builder);
    await mintHoney(usdc, halfAmount, builder);

    /*  const abi = [
      'function encodeDataForJoinKindOne(uint256 joinKind, uint256[] amounts, uint256 minimumBPT) pure returns (bytes)',
    ]; */

    const honeyAmount = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, honeyAmount, builder);

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    };
  }

  getAddressData(chainId: number): Map<AddressArg, AddressData> {
    switch (chainId) {
      case ChainIds.Cartio:
        return new Map([
          [this.inputs[ChainIds.Cartio].usdc, { label: 'ERC20:USDC' }],
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].lp, { label: 'BEX LP-HONEY-USDC' }],
          [this.inputs[ChainIds.Cartio].primary, { label: 'Kodiak Island Router' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
  getTokenHolder(chainId: number): Map<AddressArg, AddressArg> {
    const tokenToHolder = chainIdToTokenHolder.get(chainId);
    if (!tokenToHolder) throw new Error(`Unsupported 'chainId': ${chainId}`);

    return tokenToHolder as Map<AddressArg, AddressArg>;
  }
}
