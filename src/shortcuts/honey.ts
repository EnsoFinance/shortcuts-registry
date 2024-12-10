import { Shortcut, SimulationResult } from "../types";
import { Builder } from "@ensofinance/shortcuts-builder";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { AddressArg, Transaction } from "@ensofinance/shortcuts-builder/types";
import { simulateTransactionOnTenderly } from "../simulations/simulate";
import { prepareResponse } from "../utils";
import getShortcutClient, {
  ShortcutClientTypes,
} from "@ensofinance/shortcuts-builder/client";

interface HoneyShortcutInputs {
  chainId: number;
  tokensIn: AddressArg[];
  tokensOut: AddressArg[];
}

export class HoneyShortcut implements Shortcut {
  name = "";
  description = "";
  supportedChains = [80000]; // Cartio

  async getTransaction(inputs: HoneyShortcutInputs): Promise<Transaction> {
    const client = await getShortcutClient({
      type: ShortcutClientTypes.Royco,
    });
    const chainId = inputs.chainId;
    const builder = new Builder(inputs.chainId, client);

    const honey = getStandardByProtocol("berachain-honey", chainId);
    const amountIn;

    await honey.deposit.addToBuilder(builder, {
      tokenIn: inputs.tokensIn[0],
      tokenOut: inputs.tokensOut[0],
      amountIn,
      primaryAddress: this.getAddresses(chainId).honeyFactory,
    });

    const transaction = await this.buildShortcut(builder, inputs);
    return transaction;
  }

  async simulate(inputs: HoneyShortcutInputs): Promise<SimulationResult> {
    const transaction = await this.getTransaction(inputs);

    const simulationResult = await simulateTransactionOnTenderly(
      transaction,
      inputs.chainId
    );

    const result = await prepareResponse(simulationResult, transaction, inputs);
    return result;
  }

  private getAddresses = (chainId: number) => {
    const honey = getStandardByProtocol("berachain-honey", chainId);
    return {
      honeyFactory: honey.getAddress(chainId, "honeyFactory"),
    };
  };

  private async buildShortcut(
    builder: Builder,
    inputs: HoneyShortcutInputs
  ): Promise<Transaction> {
    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });
    return payload.shortcut as Transaction;
  }
}
