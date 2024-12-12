import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { Input, Output, Shortcut } from "../../types";
import { balanceOf } from "../../utils";

export class DolomiteDEthShortcut implements Shortcut {
  name = "dolomite-deth";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      base: '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3', //weth
      vault: '0xf7b5127B510E568fdC39e6Bb54e2081BFaD489AF', //deth
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