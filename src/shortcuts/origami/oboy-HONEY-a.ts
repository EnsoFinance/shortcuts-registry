import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { Input, Output, Shortcut } from "../../types";
import { balanceOf } from "../../utils";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";

export class OrigamiBoycoHoneyShortcut implements Shortcut {
  name = "origami-oboy-honey";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      base: TokenAddresses.cartio.usdc,
      vault: '0x9d98B51B3F0E085c7BDf33f26D273B6e277a27B8', //oboy-HONEY-a
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
    const amountIn = await builder.add(balanceOf(base, walletAddress()));
    
    //Mint
    const origami = getStandardByProtocol("erc4626", chainId);
    await origami.deposit.addToBuilder(builder, {
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
}