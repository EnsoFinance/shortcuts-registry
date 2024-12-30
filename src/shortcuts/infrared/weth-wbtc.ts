import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class InfraredWethWbtcShortcut implements Shortcut {
  name = 'infrared-weth-wbtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      weth: TokenAddresses.cartio.weth,
      wbtc: TokenAddresses.cartio.wbtc,
      island: '0x1E5FFDC9B4D69398c782608105d6e2B724063E13',
      vault: '0xe1e4F5b13F6E87140A657222BB9D38B78ad00bf8',
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { weth, wbtc, island, primary, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [weth, wbtc],
      tokensOut: [vault],
    });
    const amountInWeth = builder.add(balanceOf(weth, walletAddress()));
    const amountInWbtc = builder.add(balanceOf(wbtc, walletAddress()));

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [weth, wbtc],
      tokenOut: island,
      amountIn: [amountInWeth, amountInWbtc],
      primaryAddress: primary,
    });

    const amountIsland = builder.add(balanceOf(island, walletAddress()));

    const erc4626 = getStandardByProtocol('usdc-psm-bond-erc4626', chainId);
    await erc4626.deposit.addToBuilder(builder, {
      tokenIn: [island],
      tokenOut: vault,
      amountIn: [amountIsland],
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
          [this.inputs[ChainIds.Cartio].weth, { label: 'ERC20:WETH' }],
          [this.inputs[ChainIds.Cartio].wbtc, { label: 'ERC20:WBTC' }],
          [this.inputs[ChainIds.Cartio].vault, { label: 'ERC20:INFRARED_VAULT' }],
          [this.inputs[ChainIds.Cartio].island, { label: 'Kodiak Island-WETH-WBTC-0.3%' }],
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
