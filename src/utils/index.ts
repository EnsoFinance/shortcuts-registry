import { SimulationResult } from "../types";
import { Transaction } from "@ensofinance/shortcuts-builder/types";

export async function prepareResponse(
  simulationResult: any,
  transaction: Transaction,
  inputs: any
): Promise<SimulationResult> {
  // Process simulation logs, verify events, etc.
  // TBD if needed

  return {
    logs: simulationResult.logs,
    simulationURL: simulationResult.simulationURL,
    transaction,
  };
}
