import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf } from '../../utils';

export class DolomiteDSbtcShortcut implements Shortcut {
  name = 'dolomite-dsbtc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      base: getAddress('0x5d417e7798208E9285b5157498bBF23A23E421E7') as AddressArg, // SBTC
      vault: getAddress('0xA8Cb3818Fa799018bc862ADE08F8a37e08BA1062') as AddressArg, // dSBTC
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { base, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [base],
      tokensOut: [vault],
    });

    // Get the amount of token in wallet
    const amountIn = builder.add(balanceOf(base, walletAddress()));

    //Mint
    const dolomite = getStandardByProtocol('dolomite-erc4626', chainId);
    await dolomite.deposit.addToBuilder(builder, {
      tokenIn: base,
      tokenOut: vault,
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
          [this.inputs[ChainIds.Cartio].base, { label: 'ERC20:rsETH' }],
          [this.inputs[ChainIds.Cartio].vault, { label: 'ERC20:drsETH' }],
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
