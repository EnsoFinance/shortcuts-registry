import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, FromContractCallArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney } from '../../utils';

export class DolomiteDHoneyShortcut implements Shortcut {
  name = 'dolomite-dhoney';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
      honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
      dhoney: getAddress('0x7f2B60fDff1494A0E3e060532c9980d7fad0404B') as AddressArg,
      infraredVault: getAddress('0x7f2B60fDff1494A0E3e060532c9980d7fad0404B') as AddressArg, // TODO: replace
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, dhoney, infraredVault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [dhoney],
    });

    // Get the amount of USDC in the wallet, used to mint Honey
    const amountToMint = await builder.add(balanceOf(usdc, walletAddress()));

    // Mint Honey
    const mintedAmount = await mintHoney(usdc, amountToMint, builder);

    // Mint dHoney
    const dHoney = getStandardByProtocol('dolomite-erc4626', chainId);
    const { amountOut: dAmountOut } = await dHoney.deposit.addToBuilder(builder, {
      tokenIn: honey,
      tokenOut: dhoney,
      amountIn: mintedAmount,
      primaryAddress: dhoney,
    });

    // Mint rewardVault-dHoney
    const rewardVaultDHoney = getStandardByProtocol('erc4626', chainId);
    await rewardVaultDHoney.deposit.addToBuilder(builder, {
      tokenIn: dhoney,
      tokenOut: infraredVault,
      amountIn: dAmountOut as FromContractCallArg,
      primaryAddress: infraredVault,
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
          [this.inputs[ChainIds.Cartio].usdc, { label: 'ERC20:USDC' }],
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:HONEY' }],
          [this.inputs[ChainIds.Cartio].dhoney, { label: 'ERC20:dHONEY' }],
          [this.inputs[ChainIds.Cartio].infraredVault, { label: 'ERC20:irdHONEY' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }

  getTokenHolder(chainId: number): Map<AddressArg, AddressArg> {
    const tokenToHolder = chainIdToTokenHolder.get(chainId);
    if (!tokenToHolder) {
      throw new Error(`Unsupported 'chainId': ${chainId}`);
    }

    return tokenToHolder as Map<AddressArg, AddressArg>;
  }
}
