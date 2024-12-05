import { Shortcut, SimulationResult } from "../types";
import { Builder } from "@ensofinance/shortcuts-builder";
import { getStandardByProtocol } from "@ensofinance/shortcuts-standards";
import { Transaction } from "@ensofinance/shortcuts-builder/types";
import { simulateTransactionOnTenderly } from "../simulations/simulate";
import { prepareResponse } from "../utils";
import getShortcutClient, {
  ShortcutClientTypes,
} from "@ensofinance/shortcuts-builder/client";

interface IporShortcutInputs {
  chainId: number;
  tokenIn: string;
  amountIn: string;
  tokenBToBuy: string;
  percentageForTokenB: string;
  slippage: string;
  simulate?: boolean;
  isRouter?: boolean;
}

export class IporShortcut implements Shortcut {
  name = "IPOR Liquidity and Governance Shortcut";
  description =
    "Provides liquidity to IPOR pools and stakes governance tokens.";
  supportedChains = [1, 42161]; // Mainnet and Arbitrum

  async getTransaction(inputs: IporShortcutInputs): Promise<Transaction> {
    const client = await getShortcutClient({
      type: ShortcutClientTypes.Router,
    });
    const builder = new Builder(inputs.chainId, client);

    const transaction = await this.buildShortcut(builder, inputs);
    return transaction;
  }

  async simulate(inputs: IporShortcutInputs): Promise<SimulationResult> {
    const transaction = await this.getTransaction(inputs);

    const simulationResult = await simulateTransactionOnTenderly(
      transaction,
      inputs.chainId
    );

    const result = await prepareResponse(simulationResult, transaction, inputs);
    return result;
  }

  private async buildShortcut(
    builder: Builder,
    inputs: IporShortcutInputs
  ): Promise<Transaction> {
    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });
    return payload.shortcut as Transaction;
  }
}
