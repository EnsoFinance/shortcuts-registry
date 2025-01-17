import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class GoldilocksUniBtcShortcut implements Shortcut {
  name = 'goldilocks-unibtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      uniBtc: chainIdToDeFiAddresses[ChainIds.Cartio].uniBtc,
      ot: Standards.Goldilocks.protocol.addresses!.cartio!.uniBtcOt,
      yt: Standards.Goldilocks.protocol.addresses!.cartio!.uniBtcYt,
      vault: Standards.Goldilocks.protocol.addresses!.cartio!.uniBtcVault,
      island: '0x0000000000000000000000000000000000000000', // TODO: add it when deployed
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { uniBtc, ot, yt, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [uniBtc],
      tokensOut: [ot],
    });

    const amountIn = builder.add(balanceOf(uniBtc, walletAddress()));

    const goldilocks = getStandardByProtocol('goldilocks', chainId);

    const { amountOut } = await goldilocks.deposit.addToBuilder(
      builder,
      {
        tokenIn: uniBtc,
        tokenOut: [ot, yt],
        amountIn: amountIn,
        primaryAddress: vault,
      },
      ['amountOut'],
    );

    if (!Array.isArray(amountOut)) throw 'Error: Invalid amountOut'; // should never throw

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
          [this.inputs[ChainIds.Cartio].uniBtc, { label: 'ERC20:uniBtc' }],
          [this.inputs[ChainIds.Cartio].ot, { label: 'ERC20:uniBtc-OT' }],
          [this.inputs[ChainIds.Cartio].yt, { label: 'ERC20:uniBtc-YT' }],
          [this.inputs[ChainIds.Cartio].vault, { label: 'PointsGoldiVault:uniBtc' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'KodiakIsland:' }],
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
