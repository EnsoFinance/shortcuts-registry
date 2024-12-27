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
  getAddressData?(chainId: number): Map<AddressArg, AddressData>;
  getTokenHolder?(chainId: number): Map<AddressArg, AddressArg>;
}

export type Output = {
  script: WeirollScript,
  metadata: ShortcutMetadata,
}

export type RoycoOutput = {
  weirollCommands: WeirollScript['commands'];
  weirollState: WeirollScript['state'];
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

export interface AddressData {
  address?: AddressArg;
  label: string;
}

export interface SimulationRoles {
  readonly caller: AddressData;
  readonly recipeMarketHub: AddressData;
  readonly multiCall: AddressData;
  readonly setter: AddressData;
  readonly nativeToken: AddressData;
  weirollWallet: AddressData;
  callee?: AddressData;
}

export interface SimulationForgeData {
  path: string;
  contract: string;
  test: string;
}

export interface SimulationTokensData {
  tokensIn: AddressArg[];
  tokensInHolders: AddressArg[];
  amountsIn: AddressArg[];
  tokensOut: AddressArg[];
  tokensDust: AddressArg[];
}
