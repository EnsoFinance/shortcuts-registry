import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import {
  getStandardByProtocol,
  Standards,
} from "@ensofinance/shortcuts-standards";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";
import { div } from "@ensofinance/shortcuts-standards/helpers/math";
import { Input, Shortcut } from "../types";
import { balanceOf, mintHoney } from "../utils";

export class KodiakHoneyUsdcShortcut implements Shortcut {
  name = "kodiak-honey-usdc";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      tokensIn: [TokenAddresses.cartio.usdc],
      tokensOut: [
        Standards.Kodiak_Islands.protocol.addresses!.cartio!.honeyUsdcIsland,
      ],
    },
  };

  async build(chainId: number): Promise<WeirollScript> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];

    const { tokensIn, tokensOut } = inputs;
    const usdc = tokensIn[0];
    const marketMetadata = {
      tokensIn,
      tokensOut,
    };

    const builder = new Builder(chainId, client, marketMetadata);
    const kodiak = getStandardByProtocol("kodiak-islands", chainId);
    const amountIn0 = await builder.add(balanceOf(usdc, walletAddress()));
    const amountToMint = await div(amountIn0, 2, builder);
    const mintedAmount = await mintHoney(usdc, amountToMint, builder);

    const usdcAmountToDeposit = builder.add(balanceOf(usdc, walletAddress()));

    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [usdc, TokenAddresses.cartio.honey],
      tokenOut: tokensOut,
      amountIn: [usdcAmountToDeposit, mintedAmount],
      primaryAddress:
        Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    });

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return payload.shortcut as WeirollScript;
  }
}
