import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, NumberArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class GoldilocksEbtcShortcut implements Shortcut {
  name = 'goldilocks-ebtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      base: '0x888d15E66b5eb410ea5Df520Fc46f030BBa31299', //ebtc
      ot: '0xC8Cea1238Ab50d6669995c4621F57334DdE3A22a', //ebtc-ot
      yt: '0x3f33F2F068C6457B5719241ad7aef4131cC21e1F', //ebtc-yt
      vault: '0x299D37afEcfDA294448Ae24029b5Ee1c56a3F2D8',
      island: '0x',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { base, ot, yt, vault, island } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [base],
      tokensOut: [island, yt],
    });

    // Get the amount of the base token in the wallet, split 50/50, and deposit into vault
    const amountIn = await builder.add(balanceOf(base, walletAddress()));
    const halfAmount = await div(amountIn, 2, builder);

    const goldilocks = getStandardByProtocol('goldilocks', chainId);

    const { amountOut } = await goldilocks.deposit.addToBuilder(
      builder,
      {
        tokenIn: base,
        tokenOut: [ot, yt],
        amountIn: halfAmount,
        primaryAddress: vault,
      },
      ['amountOut'],
    );

    if (!Array.isArray(amountOut)) throw 'Error: Invalid amountOut'; // should never throw
    const [otAmount] = amountOut as NumberArg[];

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [base, ot],
      tokenOut: island,
      amountIn: [halfAmount, otAmount],
      primaryAddress: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    });

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
