import { contractCall } from "@ensofinance/shortcuts-builder/helpers";
import { SimulationResult } from "../types";
import {
  AddressArg,
  Transaction,
  WalletAddressArg,
} from "@ensofinance/shortcuts-builder/types";

export async function prepareResponse(
  simulationResult: any,
  transaction: Transaction,
  inputs: any
): Promise<SimulationResult> {
  return {
    logs: simulationResult.logs,
    simulationURL: simulationResult.simulationURL,
    transaction,
  };
}

export function balanceOf(token: AddressArg, owner: WalletAddressArg) {
  return contractCall({
    address: token,
    functionName: "balanceOf",
    abi: ["function balanceOf(address) external view returns (uint256)"],
    args: [owner],
  });
}
