import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class MobyWolpWbtcShortcut implements Shortcut {
  name = 'wolp-wbtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      wbtc: chainIdToDeFiAddresses[ChainIds.Cartio].wbtc,
      wolp: Standards.MobyTrade_wOlp.protocol.addresses!.cartio!.primary,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { wbtc, wolp } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wbtc],
      tokensOut: [wolp],
    });
    const amountIn = builder.add(balanceOf(wbtc, walletAddress()));

    const wOlpVault = getStandardByProtocol('moby-trade-wolp', chainId);
    await wOlpVault.deposit.addToBuilder(builder, {
      tokenIn: [wbtc],
      tokenOut: wolp,
      amountIn: [amountIn],
      primaryAddress: wolp,
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
          [this.inputs[ChainIds.Cartio].wbtc, { label: 'ERC20:WBTC' }],
          [this.inputs[ChainIds.Cartio].wolp, { label: 'ERC20:wOLP' }],
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
