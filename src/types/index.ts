import { Transaction, WeirollScript } from "@ensofinance/shortcuts-builder/types";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  inputs: any;
  build(): Promise<WeirollScript>;
}

export interface SimulationResult {
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}
