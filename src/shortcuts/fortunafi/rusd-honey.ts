import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

export class FortunafiRusdHoneyShortcut implements Shortcut {
  name = 'fortunafi-rusd-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usd: TokenAddresses.cartio.usd,
      honey: TokenAddresses.cartio.honey,
      rusd: TokenAddresses.cartio.rusd,
      island: '' as AddressArg, // TO DO: ADDING ISLAND WHEN DEPLOYED
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { rusd, usdc, honey, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [rusd, usdc],
      tokensOut: [island],
    });

    const rusdAmount = builder.add(balanceOf(rusd, walletAddress()));
    const usdcAmount = builder.add(balanceOf(usdc, walletAddress()));
    const mintedAmount = await mintHoney(usdc, usdcAmount, builder);

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [rusd, honey],
      tokenOut: island,
      amountIn: [rusdAmount, mintedAmount],
      primaryAddress: primary,
    });

    const honeyLeftOvers = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, honeyLeftOvers, builder);

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
          [
            this.inputs[ChainIds.Cartio].island,
            {
              label: 'Kodiak Island-HONEY-NECT',
            },
          ],
          [this.inputs[ChainIds.Cartio].primary, { label: 'Kodiak Island Router' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-rusd-HONEY-0.5%' }],
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].rusd, { label: 'ERC20:rusd' }],
          [this.inputs[ChainIds.Cartio].usdc, { label: 'ERC20:USDC' }],
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
