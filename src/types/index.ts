import {
  AddressArg,
  ShortcutMetadata,
  Transaction,
  WeirollScript,
} from "@ensofinance/shortcuts-builder/types";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  inputs: Record<number, Input>;
  build(chainId: number): Promise<Output>;
}

export type Output = {
  script: WeirollScript,
  metadata: ShortcutMetadata,
}

export type Input = Record<string, AddressArg>;

export interface SimulationResult {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}
