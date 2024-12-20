import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, NumberArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';
import { getAddress } from '@ethersproject/address';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class GoldilocksEbtcShortcut implements Shortcut {
  name = 'goldilocks-ebtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      ebtc: chainIdToDeFiAddresses[ChainIds.Cartio].ebtc,
      ot: getAddress(Standards.Goldilocks.protocol.addresses!.cartio!.eBtcOt) as AddressArg,
      yt: getAddress(Standards.Goldilocks.protocol.addresses!.cartio!.eBtcYt) as AddressArg,
      vault: getAddress(Standards.Goldilocks.protocol.addresses!.cartio!.eBtcVault) as AddressArg,
      island: getAddress('0x0000000000000000000000000000000000000000') as AddressArg, // TODO
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { ebtc, ot, yt, vault, island } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [ebtc],
      tokensOut: [island, yt],
    });

    // Get the amount of the base token in the wallet, split 50/50, and deposit into vault
    const amountIn = builder.add(balanceOf(ebtc, walletAddress()));
    const halfAmount = div(amountIn, 2, builder);

    const goldilocks = getStandardByProtocol('goldilocks', chainId);

    const { amountOut } = await goldilocks.deposit.addToBuilder(
      builder,
      {
        tokenIn: ebtc,
        tokenOut: [ot, yt],
        amountIn: halfAmount,
        primaryAddress: vault,
      },
      ['amountOut'],
    );

    if (!Array.isArray(amountOut)) throw 'Error: Invalid amountOut'; // should never throw
    const [otAmount] = amountOut as NumberArg[];

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);
    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [ebtc, ot],
      tokenOut: island,
      amountIn: [halfAmount, otAmount],
      primaryAddress: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    });

    const otLeftOvers = builder.add(balanceOf(ot, walletAddress()));

    await goldilocks.redeem.addToBuilder(builder, {
      tokenIn: ot,
      tokenOut: ebtc,
      amountIn: otLeftOvers,
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
          [this.inputs[ChainIds.Cartio].ebtc, { label: 'ERC20:eBTC' }],
          [this.inputs[ChainIds.Cartio].ot, { label: 'ERC20:eBTC-OT' }],
          [this.inputs[ChainIds.Cartio].yt, { label: 'ERC20:eBTC-YT' }],
          [this.inputs[ChainIds.Cartio].vault, { label: 'PointsGoldiVault:eBTC' }],
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
