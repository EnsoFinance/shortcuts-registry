import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

export class KodiakHoneyUsdcShortcut implements Shortcut {
  name = 'kodiak-honey-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      island: Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland,
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
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

    // get honey amount and burn it for usdc
    const honeyLeftovers = await builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, honeyLeftovers, builder);

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    };
  }
}
