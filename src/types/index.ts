import {
  AddressArg,
  Transaction,
  WeirollScript,
} from "@ensofinance/shortcuts-builder/types";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  inputs: Record<number, Input>;
  build(chainId: number): Promise<WeirollScript>;
}

export interface Input {
  tokensIn: AddressArg[];
  tokensOut: AddressArg[];
}

export interface SimulationResult {
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}
