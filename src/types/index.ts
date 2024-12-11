import { Transaction } from "@ensofinance/shortcuts-builder/types";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  build(inputs: any): Promise<Transaction>;
}

export interface SimulationResult {
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}
