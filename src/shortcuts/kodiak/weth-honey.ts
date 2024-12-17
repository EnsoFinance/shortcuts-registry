import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney, redeemHoney } from '../../utils';

export class KodiakWethHoneyShortcut implements Shortcut {
  name = 'kodiak-weth-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      weth: getAddress('0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3') as AddressArg,
      usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
      honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
      island: getAddress('0xD4570a738675fB2c31e7b7b88998EE73E9E17d49') as AddressArg,
      primary: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.router) as AddressArg,
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
    const usdcAmount = builder.add(balanceOf(usdc, walletAddress()));
    const wethAmount = builder.add(balanceOf(weth, walletAddress()));
    const mintedAmount = await mintHoney(usdc, usdcAmount, builder);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [weth, honey],
      tokenOut: island,
      amountIn: [wethAmount, mintedAmount],
      primaryAddress: primary,
    });

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
          [this.inputs[ChainIds.Cartio].weth, { label: 'ERC20:WETH' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-WETH-HONEY-0.3%' }],
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
