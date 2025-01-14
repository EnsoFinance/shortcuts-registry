import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { sub } from '@ensofinance/shortcuts-standards/helpers';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, depositKodiak, getSetterValue, mintHoney, redeemHoney } from '../../utils';

export class InfraredHoneyUsdcShortcut implements Shortcut {
  name = 'infrared-honey-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: chainIdToDeFiAddresses[ChainIds.Cartio].usdc,
      honey: chainIdToDeFiAddresses[ChainIds.Cartio].honey,
      island: Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland,
      vault: '0xA303Faf709bD0d8d8Fec2Ca62e5ED4708Dd94EA2',
      primary: chainIdToDeFiAddresses[ChainIds.Cartio].kodiakRouter,
    },
  };
  setterInputs: Record<number, Set<string>> = {
    [ChainIds.Cartio]: new Set(['minAmountOut', 'minAmount0Bps', 'minAmount1Bps', 'usdcToMintHoney']),
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, island, primary, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [vault],
    });
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));
    const usdcToMintHoney = getSetterValue(builder, this.setterInputs[chainId], 'usdcToMintHoney');
    const remainingUsdc = sub(amountIn, usdcToMintHoney, builder);
    const mintedAmount = await mintHoney(usdc, usdcToMintHoney, builder);

    await depositKodiak(
      builder,
      [usdc, honey],
      [remainingUsdc, mintedAmount],
      island,
      primary,
      this.setterInputs[chainId],
    );

    const amountIsland = builder.add(balanceOf(island, walletAddress()));

    const erc4626 = getStandardByProtocol('erc4626', chainId);
    await erc4626.deposit.addToBuilder(builder, {
      tokenIn: [island],
      tokenOut: vault,
      amountIn: [amountIsland],
      primaryAddress: vault,
    });

    const leftoverAmount = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, leftoverAmount, builder);

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
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-USDC-HONEY-0.5%' }],
          [this.inputs[ChainIds.Cartio].vault, { label: 'ERC20:INFRARED_VAULT' }],
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
