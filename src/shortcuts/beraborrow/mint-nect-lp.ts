import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import {
  ChainIds,
  WeirollScript,
  FromContractCallArg,
} from "@ensofinance/shortcuts-builder/types";
import {
  getStandardByProtocol,
  Standards,
} from "@ensofinance/shortcuts-standards";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";
import { div } from "@ensofinance/shortcuts-standards/helpers/math";
import { Input, Output, Shortcut } from "../../types";
import { balanceOf, mintHoney } from "../../utils";

export class MintNectLpShortcut implements Shortcut {
  name = "mint-nect-lp";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      honey: TokenAddresses.cartio.honey,
      nect: TokenAddresses.cartio.nect,
      usdc: TokenAddresses.cartio.usdc,
      usdcPsmBond: Standards.ERC4626.protocol.addresses!.cartio!.usdcPsmBond,
      island:
        Standards.Kodiak_Islands.protocol.addresses!.cartio!.nectUsdcIsland,
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { honey, nect, usdc, usdcPsmBond, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island],
    });
    const kodiak = getStandardByProtocol("kodiak-islands", chainId);
    const amountIn = builder.add(balanceOf(usdc, walletAddress()));
    const halfAmount = div(amountIn, 2, builder);
    // Get HONEY
    const mintedAmountHoney = await mintHoney(usdc, halfAmount, builder);
    // Get NECT
    const erc4626 = getStandardByProtocol("erc4626", chainId);
    const { amountOut: mintedAmountNect } = await erc4626.deposit.addToBuilder(
      builder,
      {
        tokenIn: [usdc],
        tokenOut: nect,
        amountIn: [halfAmount],
        primaryAddress: primary,
      }
    );

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [nect, honey],
      tokenOut: island,
      amountIn: [mintedAmountNect as FromContractCallArg, mintedAmountHoney],
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
