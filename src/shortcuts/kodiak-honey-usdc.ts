import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { Input, Shortcut } from '../types';
import { balanceOf } from '../utils';

export class KodiakHoneyUsdcShortcut implements Shortcut {
  name = 'kodiak-honey-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      tokensIn: [TokenAddresses.cartio.usdc, TokenAddresses.cartio.honey],
      tokensOut: [Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland],
    },
  };

  async build(chainId: number): Promise<WeirollScript> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];

    const { tokensIn, tokensOut } = inputs;
    const marketMetadata = {
      tokensIn,
      tokensOut,
    };

    const builder = new Builder(chainId, client, marketMetadata);

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);

    const amountIn0 = await builder.add(balanceOf(tokensIn[0], walletAddress()));
    const amountIn1 = await builder.add(balanceOf(tokensIn[1], walletAddress()));
    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: tokensIn,
      tokenOut: tokensOut,
      amountIn: [amountIn0, amountIn1],
      primaryAddress: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    });

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return payload.shortcut as WeirollScript;
  }
}
