import { Builder } from "@ensofinance/shortcuts-builder";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { Input, Shortcut } from "../types";
import { balanceOf, mintHoney } from "../utils";
import { TokenAddresses } from "@ensofinance/shortcuts-standards/addresses";

export class DolomiteDHoneyShortcut implements Shortcut {
  name = "dolomite-dhoney";
  description = "";
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      tokensIn: [TokenAddresses.cartio.usdc],
      tokensOut: ["0x7f2B60fDff1494A0E3e060532c9980d7fad0404B"],
    },
  };

  async build(chainId: number): Promise<WeirollScript> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { tokensIn, tokensOut } = inputs;
    const marketMetadata = {
      tokensIn,
      tokensOut,
    };
    const builder = new Builder(chainId, client, marketMetadata);
    const { usdc, honey, dhoney } = this.getAddresses(inputs);

    // Get the amount of USDC in the wallet, used to mint Honey
    const amountToMint = await builder.add(balanceOf(usdc, walletAddress()));
    // Mint Honey
    const mintedAmount = await mintHoney(usdc, amountToMint, builder);

    //Mint dHoney
    const dHoney = getStandardByProtocol("dolomite-erc4626", chainId);
    await dHoney.deposit.addToBuilder(builder, {
      tokenIn: honey,
      tokenOut: dhoney,
      amountIn: mintedAmount,
      primaryAddress: dhoney,
    });

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return payload.shortcut as WeirollScript;
  }

  private getAddresses = (inputs: Input) => {
    const usdc = inputs.tokensIn[0];
    const honey = TokenAddresses.cartio.honey;
    const dhoney = inputs.tokensOut[0];
    return {
      usdc,
      honey,
      dhoney,
    };
  };
}
