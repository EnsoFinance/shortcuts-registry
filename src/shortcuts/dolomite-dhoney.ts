import { Input, Shortcut } from "../types";
import { Builder } from "@ensofinance/shortcuts-builder";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { ChainIds, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { balanceOf } from "../utils";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";

export class DolomiteDHoneyShortcut implements Shortcut {
  name = 'dolomite-dhoney';
  description = '';
  supportedChains = [ChainIds.Cartio];
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      tokensIn: ['0xd137593CDB341CcC78426c54Fb98435C60Da193c'],
      tokensOut: ['0x7f2B60fDff1494A0E3e060532c9980d7fad0404B'],
    }
  }

  async build(chainId: number): Promise<WeirollScript> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];

    const { tokensIn, tokensOut } = inputs;
    const marketMetadata = {
      tokensIn,
      tokensOut,
    };

    const builder = new Builder(chainId, client, marketMetadata);

    const { honey, dhoney } = this.getAddresses(inputs);

    const dHoney = getStandardByProtocol("dolomite-erc4626", chainId);

    const amountIn = await builder.add(balanceOf(tokensIn[0], walletAddress()));
    await dHoney.deposit.addToBuilder(builder, {
      tokenIn: honey,
      tokenOut: dhoney,
      amountIn,
      primaryAddress: dhoney,
    });

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return payload.shortcut as WeirollScript;
  }

  private getAddresses = (inputs: Input) => {
    const honey = inputs.tokensIn[0];
    const dhoney = inputs.tokensOut[0];
    return {
      honey,
      dhoney,
    };
  };
}
