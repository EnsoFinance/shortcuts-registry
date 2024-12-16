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
  getLabelsData?(chainId: number): LabelsData;
  getTokenTholder?(chainId: number): Map<AddressArg, AddressArg>;
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

export type Report = {
  quote: Record<string, string>;
  dust: Record<string, string>;
  gas: string;
};

export interface ProtocolToLabelData {
  label: string;
}

export interface TokenToLabelData {
  label: string;
  isTokenDust: boolean;
}

export interface LabelsData {
  protocolToData: Map<AddressArg, ProtocolToLabelData>;
  tokenToData: Map<AddressArg, TokenToLabelData>;
}
