import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class SatlayerSolvBtcShortcut implements Shortcut {
  name = 'satlayer-solvbtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      depositToken: '0xB4618618b6Fcb61b72feD991AdcC344f43EE57Ad', // SolvBtc
      receiptToken: '0xC034312c39DEdEE529fa6de123d0b24DBb43a053',
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
          [this.inputs[ChainIds.Cartio].depositToken, { label: 'ERC20:SolvBtc' }],
          [this.inputs[ChainIds.Cartio].receiptToken, { label: 'ERC20:satSolvBtc' }],
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
