import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { Input, Output, Shortcut } from "../../types";
import { balanceOf } from "../../utils";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";

export class DolomiteDUsdcShortcut implements Shortcut {
  name = "dolomite-dusdc";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      base: TokenAddresses.cartio.usdc,
      vault: '0x444868B6e8079ac2c55eea115250f92C2b2c4D14', //dusdc
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
    const dolomite = getStandardByProtocol("dolomite-erc4626", chainId);
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
}
