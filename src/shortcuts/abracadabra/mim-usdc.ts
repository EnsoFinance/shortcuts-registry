import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import {
  getStandardByProtocol,
  Standards,
} from "@ensofinance/shortcuts-standards";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";
import { Input, Output, Shortcut } from "../../types";
import { balanceOf, mintHoney } from "../../utils";

export class AbracadabraMimUsdcShortcut implements Shortcut {
  name = "abracadabra-mim-usdc";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      mim: '0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63',
      island: '0x150683BF3f0a344e271fc1b7dac3783623e7208A',
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { mim, usdc, honey, island, primary } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [mim, usdc],
      tokensOut: [island, honey], // include honey as token out, since we want to recover dust
    });
    
    const mimAmount = await builder.add(balanceOf(mim, walletAddress()));
    const usdcAmount = await builder.add(balanceOf(usdc, walletAddress()));
    const honeyAmount = await mintHoney(usdc, usdcAmount, builder);

    const kodiak = getStandardByProtocol("kodiak-islands", chainId);
    await kodiak.deposit.addToBuilder(builder, {
      tokenIn: [mim, honey],
      tokenOut: island,
      amountIn: [mimAmount, honeyAmount],
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
