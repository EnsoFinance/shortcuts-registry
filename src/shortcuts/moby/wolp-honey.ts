import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class MobyWolpHoneyShortcut implements Shortcut {
  name = 'wolp-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      honey: getAddress(Standards.MobyTrade_wOlp.protocol.addresses?.cartio?.honey as string) as AddressArg,
      wolp: getAddress(Standards.MobyTrade_wOlp.protocol.addresses?.cartio?.primary as string) as AddressArg,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { honey, wolp } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [honey],
      tokensOut: [wolp],
    });
    const amountIn = builder.add(balanceOf(honey, walletAddress()));

    const wOlpVault = getStandardByProtocol('moby-trade-wolp', chainId);
    await wOlpVault.deposit.addToBuilder(builder, {
      tokenIn: [honey],
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
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
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
