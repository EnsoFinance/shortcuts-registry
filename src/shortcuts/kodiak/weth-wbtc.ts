import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { addresses, balanceOf, depositKodiak } from '../../utils';

export class KodiakWethWbtcShortcut implements Shortcut {
  name = 'kodiak-weth-wbtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      weth: getAddress(TokenAddresses.cartio.weth) as AddressArg,
      wbtc: getAddress(TokenAddresses.cartio.wbtc) as AddressArg,
      island: getAddress('0x1E5FFDC9B4D69398c782608105d6e2B724063E13') as AddressArg,
      primary: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.router) as AddressArg,
      setter: addresses[ChainIds.Cartio].setter, // having setter in inputs lets simulator know to set a min amount value
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { weth, wbtc, island, primary, setter } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [weth, wbtc],
      tokensOut: [island],
    });
    const amountInWeth = await builder.add(balanceOf(weth, walletAddress()));
    const amountInWbtc = await builder.add(balanceOf(wbtc, walletAddress()));

    await depositKodiak(builder, [weth, wbtc], [amountInWeth, amountInWbtc], island, primary, setter, false);

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
          [this.inputs[ChainIds.Cartio].weth, { label: 'ERC20:WETH' }],
          [this.inputs[ChainIds.Cartio].wbtc, { label: 'ERC20:WBTC' }],
          [this.inputs[ChainIds.Cartio].setter, { label: 'CCMD-Setter' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-WETH-WBTC-0.3%' }],
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
