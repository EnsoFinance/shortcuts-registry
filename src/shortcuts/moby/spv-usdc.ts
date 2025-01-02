import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { addAction, addApprovals, div } from '@ensofinance/shortcuts-standards/helpers';
import { MaxUint256 } from '@ethersproject/constants';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney } from '../../utils';

export class MobySpvUsdcShortcut implements Shortcut {
  name = 'spv-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      spv: '0xC4E80693F0020eDA0a7500d6edE12Ebb5FDf4526',
      bexLp: '0xF7F214A9543c1153eF5DF2edCd839074615F248c',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, spv, honey, bexLp } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [spv],
    });
    const amountToDeposit = builder.add(balanceOf(usdc, walletAddress()));

    const halfAmount = div(amountToDeposit, 2, builder);
    // Get HONEY
    await mintHoney(usdc, halfAmount, builder);
    const amountHoneyMinted = builder.add(balanceOf(honey, walletAddress()));

    const amountUsdc = builder.add(balanceOf(usdc, walletAddress()));
    const approvals = {
      tokens: [usdc, honey, bexLp],
      amounts: [amountUsdc, amountHoneyMinted, MaxUint256],
      spender: spv,
    };

    await addApprovals(builder, approvals);
    await addAction({
      builder,
      action: {
        address: spv,
        abi: [
          'function addLiquidity(address usdcAddress, address honeyAddress, uint256 amountUsdc, uint256 amountHoney)',
        ],
        functionName: 'addLiquidity',
        args: [usdc, honey, amountUsdc, amountHoneyMinted],
      },
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
          [this.inputs[ChainIds.Cartio].honey, { label: 'ERC20:Honey' }],
          [this.inputs[ChainIds.Cartio].spv, { label: 'ERC20:SPV' }],
          [this.inputs[ChainIds.Cartio].bexLp, { label: 'ERC20:USDC-HONEY-COMPOSABLESTABLE' }],
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
