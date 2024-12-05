import { Transaction } from "@ensofinance/shortcuts-builder/types";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  getTransaction(inputs: any): Promise<Transaction>;
  simulate(inputs: any): Promise<SimulationResult>;
}

export interface SimulationResult {
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}
