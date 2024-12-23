import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

export class KodiakHoneyUsdcShortcut implements Shortcut {
  name = 'kodiak-honey-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
      honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
      island: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland) as AddressArg,
      primary: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.router) as AddressArg,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island],
    });
    const kodiak = getStandardByProtocol('kodiak-islands', chainId);
    const amountIn = await builder.add(balanceOf(usdc, walletAddress()));
    const halfAmount = await div(amountIn, 2, builder);
    const mintedAmount = await mintHoney(usdc, halfAmount, builder);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [usdc, honey],
      tokenOut: island,
      amountIn: [halfAmount, mintedAmount],
      primaryAddress: primary,
    });

    const leftoverAmount = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, leftoverAmount, builder);

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
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-USDC-HONEY-0.5%' }],
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
