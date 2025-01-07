import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, depositBurrbear } from '../../utils';

export class BurrbearUsdcShortcut implements Shortcut {
  name = 'usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      vault: chainIdToDeFiAddresses[ChainIds.Cartio].burrbearZap,
      bexLp: '0xFbb99BAD8eca0736A9ab2a7f566dEbC9acb607f0', //Honey-USDC-NECT
    },
  };
  setterInputs: Record<number, Set<string>> = {
    [ChainIds.Cartio]: new Set(['minAmountOut']),
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, bexLp } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [bexLp],
    });

    // Get the amount of token in wallet
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));

    //Mint
    await depositBurrbear(builder, amountIn, this.setterInputs[chainId]);

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
          [this.inputs[ChainIds.Cartio].vault, { label: 'ERC20:Burrbear ZAP' }],
          [this.inputs[ChainIds.Cartio].bexLp, { label: 'ERC20:BEX LP HONEY-USDC-NECT' }],
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
