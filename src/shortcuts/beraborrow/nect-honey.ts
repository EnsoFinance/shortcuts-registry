import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { contractCall, walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, FromContractCallArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { sub } from '@ensofinance/shortcuts-standards/helpers/math';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, depositKodiak, getSetterValue, mintHoney, redeemHoney } from '../../utils';

export class BeraborrowNectHoneyShortcut implements Shortcut {
  name = 'nect-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      honey: chainIdToDeFiAddresses[ChainIds.Cartio].honey,
      nect: chainIdToDeFiAddresses[ChainIds.Cartio].nect,
      usdc: chainIdToDeFiAddresses[ChainIds.Cartio].usdc,
      usdcPsmBond: '0xd064C80776497821313b1Dc0E3192d1a67b2a9fa',
      island: Standards.Kodiak_Islands.protocol.addresses!.cartio!.nectUsdcIsland, // KODI-HONEY-NECT
      primary: chainIdToDeFiAddresses[ChainIds.Cartio].kodiakRouter,
      quoterV2: chainIdToDeFiAddresses[ChainIds.Cartio].kodiakQuoterV2,
    },
  };
  setterInputs: Record<number, Set<string>> = {
    [ChainIds.Cartio]: new Set(['minAmountOut', 'minAmount0Bps', 'minAmount1Bps', 'usdcToMintHoney']),
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { honey, nect, usdc, usdcPsmBond, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island],
    });
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));
    const usdcToMintHoney = getSetterValue(builder, this.setterInputs[chainId], 'usdcToMintHoney');
    const remainingUsdc = sub(amountIn, usdcToMintHoney, builder);
    // Get HONEY
    const mintedAmountHoney = await mintHoney(usdc, usdcToMintHoney, builder);
    // Get NECT
    const erc4626 = getStandardByProtocol('usdc-psm-bond-erc4626', chainId);
    const { amountOut: mintedAmountNect } = await erc4626.deposit.addToBuilder(builder, {
      tokenIn: [usdc],
      tokenOut: nect,
      amountIn: [remainingUsdc],
      primaryAddress: usdcPsmBond,
    });

    await depositKodiak(
      builder,
      [honey, nect],
      [mintedAmountHoney, mintedAmountNect as FromContractCallArg],
      island,
      primary,
      this.setterInputs[chainId],
    );

    const honeyLeftoverAmount = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, honeyLeftoverAmount, builder);

    const nectLeftoversAmount = builder.add(balanceOf(nect, walletAddress()));
    const withdrawLeftovers = contractCall({
      address: usdcPsmBond,
      functionName: 'withdraw',
      abi: ['function withdraw(uint shares, address receiver, address owner) '],
      args: [nectLeftoversAmount, walletAddress(), walletAddress()],
    });

    builder.add(withdrawLeftovers);

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
          [this.inputs[ChainIds.Cartio].quoterV2, { label: 'Kodiak QuoterV2' }],
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].nect, { label: 'ERC20:NECT' }],
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
