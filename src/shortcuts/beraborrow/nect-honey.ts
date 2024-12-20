import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg, ChainIds, FromContractCallArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { addAction, addApprovals } from '@ensofinance/shortcuts-standards/helpers';
import { div } from '@ensofinance/shortcuts-standards/helpers/math';
import { getAddress } from '@ethersproject/address';

import { chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { addresses, balanceOf, depositKodiak, mintHoney, redeemHoney } from '../../utils';

export class BeraborrowNectHoneyShortcut implements Shortcut {
  name = 'nect-honey';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      honey: addresses[ChainIds.Cartio].honey,
      nect: addresses[ChainIds.Cartio].nect,
      usdc: addresses[ChainIds.Cartio].usdc,
      usdcPsmBond: getAddress('0xd064C80776497821313b1Dc0E3192d1a67b2a9fa') as AddressArg,
      island: getAddress('0xaEdC80dCdc872FA7B5FB4c5EC5d8C8696BB05f5d') as AddressArg, // KODI-HONEY-NECT
      primary: addresses[ChainIds.Cartio].kodiakRouter,
      quoterV2: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.quoterV2) as AddressArg,
      setter: addresses[ChainIds.Cartio].setter, // having setter in inputs lets simulator know to set a min amount value
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { honey, nect, usdc, usdcPsmBond, island, primary, setter } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island],
    });
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));
    const halfAmount = div(amountIn, 2, builder);
    // Get HONEY
    const mintedAmountHoney = await mintHoney(usdc, halfAmount, builder);
    // Get NECT
    const erc4626 = getStandardByProtocol('usdc-psm-bond-erc4626', chainId);
    const { amountOut: mintedAmountNect } = await erc4626.deposit.addToBuilder(builder, {
      tokenIn: [usdc],
      tokenOut: nect,
      amountIn: [halfAmount],
      primaryAddress: usdcPsmBond,
    });

    await depositKodiak(
      builder,
      [nect, honey],
      [mintedAmountNect as FromContractCallArg, mintedAmountHoney],
      island,
      primary,
      setter,
      false,
    );

<<<<<<< HEAD:src/shortcuts/beraborrow/nect-honey.ts
    const honeyLeftOvers = builder.add(balanceOf(honey, walletAddress()));
    await redeemHoney(usdc, honeyLeftOvers, builder);

    const nectLeftOvers = builder.add(balanceOf(nect, walletAddress()));

    const approvals = {
      tokens: [nect],
      amounts: [nectLeftOvers],
      spender: usdcPsmBond,
    };

    await addApprovals(builder, approvals);
    await addAction({
      builder,
      action: {
        address: usdcPsmBond,
        abi: ['function withdraw(uint256 shares, address receiver, address owner) returns (uint256)'],
        functionName: 'withdraw',
        args: [nectLeftOvers, walletAddress(), walletAddress()],
      },
    });

=======
    /*    const nectLeftovers = builder.add(balanceOf(nect, walletAddress()));

    const withdrawLeftovers = contractCall({
      address: usdcPsmBond,
      functionName: 'withdraw',
      abi: ['function withdraw(uint shares, address receiver, address owner) '],
      args: [nectLeftovers, walletAddress(), walletAddress()],
    });

    await builder.add(withdrawLeftovers);
 */

>>>>>>> a0992c8 (collect nect leftovers):src/shortcuts/beraborrow/mint-nect-lp.ts
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
