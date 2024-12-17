import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

export class KodiakWethHoneyShortcut implements Shortcut {
  name = 'kodiak-weth-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      weth: TokenAddresses.cartio.weth,
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      island: '0xD4570a738675fB2c31e7b7b88998EE73E9E17d49',
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { weth, usdc, honey, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [weth, usdc],
      tokensOut: [island],
    });
    const kodiak = getStandardByProtocol('kodiak-islands', chainId);
    const usdcAmount = await builder.add(balanceOf(usdc, walletAddress()));
    const wethAmount = await builder.add(balanceOf(weth, walletAddress()));
    const mintedAmount = await mintHoney(usdc, usdcAmount, builder);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [weth, honey],
      tokenOut: island,
      amountIn: [wethAmount, mintedAmount],
      primaryAddress: primary,
    });

    const honeyAmount = await builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(honey, honeyAmount, builder);

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
