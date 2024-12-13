import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney } from '../../utils';

export class DolomiteDHoneyShortcut implements Shortcut {
  name = 'dolomite-dhoney';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      dhoney: '0x7f2B60fDff1494A0E3e060532c9980d7fad0404B',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, dhoney } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [dhoney, honey],
    });

    // Get the amount of USDC in the wallet, used to mint Honey
    const amountToMint = await builder.add(balanceOf(usdc, walletAddress()));
    // Mint Honey
    const mintedAmount = await mintHoney(usdc, amountToMint, builder);

    //Mint dHoney
    const dHoney = getStandardByProtocol('dolomite-erc4626', chainId);
    await dHoney.deposit.addToBuilder(builder, {
      tokenIn: honey,
      tokenOut: dhoney,
      amountIn: mintedAmount,
      primaryAddress: dhoney,
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
