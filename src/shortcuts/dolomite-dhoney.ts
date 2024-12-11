import { Shortcut } from "../types";
import { Builder } from "@ensofinance/shortcuts-builder";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { AddressArg, WeirollScript } from "@ensofinance/shortcuts-builder/types";
import { balanceOf } from "../utils";
import { RoycoClient } from "@ensofinance/shortcuts-builder/client/implementations/roycoClient";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";

interface DolomiteDHoneyShortcutInputs {
  chainId: number;
  tokensIn: AddressArg[];
  tokensOut: AddressArg[];
}

export class DolomiteDHoneyShortcut implements Shortcut {
  name = 'dolomite-dhoney';
  description = '';
  supportedChains = [80000];
  inputs: DolomiteDHoneyShortcutInputs = {
    chainId: 80000,
    tokensIn: ['0xd137593CDB341CcC78426c54Fb98435C60Da193c'],
    tokensOut: ['0x7f2B60fDff1494A0E3e060532c9980d7fad0404B'],
  };

  async build(): Promise<WeirollScript> {
    const client = new RoycoClient();

    const inputs = this.inputs;

    const { tokensIn, tokensOut } = inputs;
    const marketMetadata = {
      tokensIn,
      tokensOut,
    };

    const chainId = inputs.chainId;
    const builder = new Builder(inputs.chainId, client, marketMetadata);

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

    console.log(payload);
    return payload.shortcut as WeirollScript;
  }

  private getAddresses = (inputs: DolomiteDHoneyShortcutInputs) => {
    const honey = inputs.tokensIn[0];
    const dhoney = inputs.tokensOut[0];
    return {
      honey,
      dhoney,
    };
  };
}
