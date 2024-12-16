import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { helperAddresses, TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { add, div, mul, percentMul, sub, getAmountOutFromBytes } from '@ensofinance/shortcuts-standards/helpers';

import { Input, Output, Shortcut } from '../../types';
import { balanceOf, mintHoney } from '../../utils';

const PRECISION = '100000000000000000';

export class KodiakHoneyUsdcShortcut implements Shortcut {
  name = 'kodiak-honey-usdc';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      island: Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland,
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
      honeyFactory: Standards.Berachain_Honey.protocol.addresses!.cartio!.honeyFactory,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdc, honey, honeyFactory, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island, honey],
    });
    
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));

    const islandBalances = builder.add({
      address: island,
      abi: ['function getUnderlyingBalances() external view returns (uint256, uint256)'],
      functionName: 'getUnderlyingBalances',
      args: [],
    });

    const usdcOnIsland = getAmountOutFromBytes(builder, islandBalances, 0);
    const honeyOnIsland = getAmountOutFromBytes(builder, islandBalances, 1);

    const honeyWithPrecision = mul(honeyOnIsland, PRECISION, builder);

    const mintRates = builder.add({
      address: honeyFactory,
      abi: ['function mintRates(address) external view returns (uint256)'],
      functionName: 'mintRates',
      args: [usdc],
    });

    const mintRatesShifted = div(mintRates, '1000000', builder); // shift by usdc decimal precision

    const relativeUsdc = div(honeyWithPrecision, mintRatesShifted, builder);

    const usdcWithPrecision = mul(usdcOnIsland, PRECISION, builder);

    const amountInWithMultiplier = mul(amountIn, usdcWithPrecision, builder);

    const totalUsdcWithPrecision = add(usdcWithPrecision, relativeUsdc, builder);

    const amountUsdc = div(amountInWithMultiplier, totalUsdcWithPrecision, builder)

    const amountUsdcForHoney = sub(amountIn, amountUsdc, builder);

    const condition = builder.add({
      address: helperAddresses(chainId).shortcutsHelpers,
      abi: ['function isGreaterThan(uint256,uint256) external view returns (bool)'],
      functionName: 'isGreaterThan',
      args: [amountUsdcForHoney, 0],
    });

    const amountUsdcToConvert = builder.add({
      address: helperAddresses(chainId).shortcutsHelpers,
      abi: ['function toggle(bool,uint256,uint256) external view returns (uint256)'],
      functionName: 'toggle',
      args: [condition, amountUsdcForHoney, 1],
    });

    const mintedAmount = await mintHoney(usdc, amountUsdcToConvert, builder);

    const kodiak = getStandardByProtocol('kodiak-islands', chainId);
    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [usdc, honey],
      tokenOut: island,
      amountIn: [amountUsdc, mintedAmount],
      primaryAddress: primary,
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
