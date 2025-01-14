import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class SatlayerWabtcShortcut implements Shortcut {
  name = 'satlayer-wabtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      depositToken: '0x97fed7F1961a3B2772e086ff39981f42c0E0C0B8', // WABTC
      receiptToken: '0x70A97CB5587B91d9f84b01828b5492B9b3556fFD',
      vault: Standards.Satlayer_Vaults.protocol.addresses!.cartio!.vault,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { depositToken, vault, receiptToken } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [depositToken],
      tokensOut: [receiptToken],
    });

    // Get the amount of token in wallet
    const amountIn = builder.add(balanceOf(depositToken, walletAddress()));

    // Mint
    const satlayer = getStandardByProtocol('satlayer-vaults', chainId);

    await satlayer.deposit.addToBuilder(builder, {
      tokenIn: depositToken,
      tokenOut: receiptToken,
      amountIn,
      primaryAddress: vault,
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
          [this.inputs[ChainIds.Cartio].vault, { label: 'SatlayerPool' }],
          [this.inputs[ChainIds.Cartio].depositToken, { label: 'ERC20:WaBtc' }],
          [this.inputs[ChainIds.Cartio].receiptToken, { label: 'ERC20:satBtc' }],
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
