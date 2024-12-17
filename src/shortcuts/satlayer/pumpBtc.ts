import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class SatlayerPumpBtcShortcut implements Shortcut {
  name = 'satlayer-pumpBtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      depositToken: Standards.Satlayer_Vaults.protocol.addresses!.cartio!.pumpBtc,
      receiptToken: Standards.Satlayer_Vaults.protocol.addresses!.cartio!.receiptToken,
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
    const amountIn = await builder.add(balanceOf(depositToken, walletAddress()));

    //Mint
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
}
