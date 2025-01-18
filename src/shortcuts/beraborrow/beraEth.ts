import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { helperAddresses } from '@ensofinance/shortcuts-standards/addresses';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, getSetterValue } from '../../utils';

export class BeraborrowBeraethShortcut implements Shortcut {
  name = 'beraeth';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      weth: chainIdToDeFiAddresses[ChainIds.Cartio].weth,
      beraEth: chainIdToDeFiAddresses[ChainIds.Cartio].beraEth,
      rBeraEth: chainIdToDeFiAddresses[ChainIds.Cartio].rBeraEth,
      primary: '0x25189a55463d2974F6b55268A09ccEe92f8aa043',
    },
  };
  setterInputs: Record<number, Set<string>> = {
    [ChainIds.Cartio]: new Set(['minAmountOut']),
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { weth, beraEth, rBeraEth, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [weth],
      tokensOut: [primary],
    });
    const amountIn = builder.add(balanceOf(weth, walletAddress()));

    const dineroBeraeth = getStandardByProtocol('dinero-beraEth', chainId, true);
    await dineroBeraeth.deposit.addToBuilder(builder, {
      tokenIn: [weth],
      tokenOut: beraEth,
      amountIn: [amountIn],
      primaryAddress: rBeraEth,
    });

    const beraEthAmount = builder.add(balanceOf(beraEth, walletAddress()));

    const erc4626 = getStandardByProtocol('erc4626', chainId);
    await erc4626.deposit.addToBuilder(builder, {
      tokenIn: [beraEth],
      tokenOut: primary,
      amountIn: [beraEthAmount],
      primaryAddress: primary,
    });

    const amountVaultToken = builder.add(balanceOf(primary, walletAddress()));
    const amountSharesMin = getSetterValue(builder, this.setterInputs[chainId], 'minAmountOut');

    const isCorrectAmount = builder.add({
      address: helperAddresses(builder.chainId).shortcutsHelpers,
      abi: ['function isEqualOrGreaterThan(uint256, uint256) external view returns (bool)'],
      functionName: 'isEqualOrGreaterThan',
      args: [amountVaultToken, amountSharesMin],
    });

    builder.add({
      address: helperAddresses(builder.chainId).shortcutsHelpers,
      abi: ['function check(bool condition) public pure returns (bool)'],
      functionName: 'check',
      args: [isCorrectAmount],
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
          [this.inputs[ChainIds.Cartio].primary, { label: 'Beraborrow Boyco beraEth' }],
          [this.inputs[ChainIds.Cartio].beraEth, { label: 'ERC20:beraEth' }],
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
