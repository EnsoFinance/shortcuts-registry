import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ethersproject/address';

import { chainIdToDeFiAddresses, chainIdToSimulationRoles, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, depositKodiak, mintHoney } from '../../utils';

export class AbracadabraHoneyMimShortcut implements Shortcut {
  name = 'abracadabra-honey-mim';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: chainIdToDeFiAddresses[ChainIds.Cartio].usdc,
      honey: chainIdToDeFiAddresses[ChainIds.Cartio].honey,
      mim: chainIdToDeFiAddresses[ChainIds.Cartio].mim,
      island: getAddress('0x150683BF3f0a344e271fc1b7dac3783623e7208A') as AddressArg,
      primary: chainIdToDeFiAddresses[ChainIds.Cartio].kodiakRouter,
      setter: chainIdToSimulationRoles.get(ChainIds.Cartio)!.setter.address!, // having setter in inputs lets simulator know to set a min amount value
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { mim, usdc, honey, island, primary, setter } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [mim, usdc],
      tokensOut: [island],
    });

    const mimAmount = builder.add(balanceOf(mim, walletAddress()));
    const usdcAmount = builder.add(balanceOf(usdc, walletAddress()));
    const mintedAmount = await mintHoney(usdc, usdcAmount, builder);

    await depositKodiak(builder, [mim, honey], [mimAmount, mintedAmount], island, primary, setter, false);

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
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-MIM-HONEY-0.05%' }],
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
