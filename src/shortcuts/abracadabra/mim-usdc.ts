import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney } from '../../utils';

export class AbracadabraMimUsdcShortcut implements Shortcut {
  name = 'abracadabra-mim-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
      honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
      mim: getAddress(TokenAddresses.cartio.mim) as AddressArg,
      island: getAddress('0x150683BF3f0a344e271fc1b7dac3783623e7208A') as AddressArg,
      primary: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.router) as AddressArg,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { mim, usdc, honey, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [mim, usdc],
      tokensOut: [island],
    });

    const mimAmount = builder.add(balanceOf(mim, walletAddress()));
    const usdcAmount = builder.add(balanceOf(usdc, walletAddress()));
    const honeyAmount = await mintHoney(usdc, usdcAmount, builder);

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);
    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [mim, honey],
      tokenOut: island,
      amountIn: [mimAmount, honeyAmount],
      primaryAddress: primary,
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
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-MIM-HONEY-0.5%' }],
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].mim, { label: 'ERC20:MIM' }],
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
