import { Shortcut } from "../types";
import { Builder } from "@ensofinance/shortcuts-builder";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { AddressArg, Transaction } from "@ensofinance/shortcuts-builder/types";
import { balanceOf } from "../utils";
import getShortcutClient, {
  ShortcutClientTypes,
} from "@ensofinance/shortcuts-builder/client";
import { walletAddress } from "@ensofinance/shortcuts-builder/helpers";

interface DolomiteDHoneyShortcutInputs {
  chainId: number;
  tokensIn: AddressArg[];
  tokensOut: AddressArg[];
}

export class DolomiteDHoneyShortcut implements Shortcut {
  name = "";
  description = "";
  supportedChains = [80000];
  inputs: DolomiteDHoneyShortcutInputs = {
    chainId: 80000,
    tokensIn: ["0xHoneyTokenAddress..."], // Replace with actual tokenIn address
    tokensOut: ["0xDHoneyTokenAddress..."], // Replace with actual tokenOut address
  };

  async build(): Promise<Transaction> {
    const client = await getShortcutClient({
      type: ShortcutClientTypes.Royco,
    });

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
    return payload.shortcut as Transaction;
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
