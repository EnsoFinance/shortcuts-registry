import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { chainIdToDeFiAddresses } from '../constants';
import { Campaign } from '../types';
import { getSimulationRolesByChainId } from './utils';

async function call(
  provider: StaticJsonRpcProvider,
  iface: Interface,
  target: string,
  method: string,
  args: ReadonlyArray<BigNumberish>,
) {
  const data = await provider.call({
    to: target,
    data: iface.encodeFunctionData(method, args),
  });
  return iface.decodeFunctionResult(method, data);
}

export function getEncodedData(commands: string[], state: string[]): string {
  const weirollWalletInterface = new Interface([
    'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
  ]);
  return weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
}

export async function getHoneyExchangeRate(
  provider: StaticJsonRpcProvider,
  chainId: number,
  underlyingToken: AddressArg,
): Promise<BigNumber> {
  const honeyFactoryInterface = new Interface(['function mintRates(address) external view returns (uint256)']);
  const honeyFactory = chainIdToDeFiAddresses[chainId]!.honeyFactory;
  return (await call(provider, honeyFactoryInterface, honeyFactory, 'mintRates', [underlyingToken]))[0] as BigNumber;
}

export async function getIslandMintAmounts(
  provider: StaticJsonRpcProvider,
  island: AddressArg,
  amounts: string[],
): Promise<{ amount0: BigNumber; amount1: BigNumber; mintAmount: BigNumber }> {
  const islandInterface = new Interface([
    'function getMintAmounts(uint256, uint256) external view returns (uint256 amount0, uint256 amount1, uint256 mintAmount)',
  ]);
  const mintAmounts = await call(provider, islandInterface, island, 'getMintAmounts', amounts);
  return {
    amount0: mintAmounts.amount0,
    amount1: mintAmounts.amount1,
    mintAmount: mintAmounts.mintAmount,
  };
}

export async function getIslandTokens(
  provider: StaticJsonRpcProvider,
  island: AddressArg,
): Promise<{ token0: AddressArg; token1: AddressArg }> {
  const islandInterface = new Interface([
    'function token0() external view returns (address token)',
    'function token1() external view returns (address token)',
  ]);
  const [token0, token1] = (
    await Promise.all([
      call(provider, islandInterface, island, 'token0', []),
      call(provider, islandInterface, island, 'token1', []),
    ])
  ).map((response) => response.token);

  return {
    token0,
    token1,
  };
}

export async function getCampaignVerificationHash(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<string> {
  const depositExecutorInterface = new Interface([
    'function getCampaignVerificationHash(bytes32 marketHash) external view returns (bytes32 verificationHash)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  return (
    await call(provider, depositExecutorInterface, roles.depositExecutor.address!, 'getCampaignVerificationHash', [
      marketHash,
    ])
  ).verificationHash as string;
}

export async function getCampaign(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<Campaign> {
  const depositExecutorInterface = new Interface([
    'function sourceMarketHashToDepositCampaign(bytes32 marketHash) external view returns (address owner, bool verified, uint8 numInputTokens, address receiptToken, uint256 unlockTimestamp, tuple(bytes32[] commands, bytes[] state) depositRecipe)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  return (await call(
    provider,
    depositExecutorInterface,
    roles.depositExecutor.address!,
    'sourceMarketHashToDepositCampaign',
    [marketHash],
  )) as unknown as Campaign;
}

export async function getTotalTokenAmountDeposited(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
  wallet: string,
  tokens: string[],
): Promise<BigNumber[]> {
  const depositExecutorInterface = new Interface([
    'function getTotalTokenAmountDepositedInWeirollWallet(bytes32 _sourceMarketHash, address _weirollWallet, address _token) external view returns (uint256 totalAmountDeposited)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  return Promise.all(
    tokens.map(
      async (token) =>
        (
          await call(
            provider,
            depositExecutorInterface,
            roles.depositExecutor.address!,
            'getTotalTokenAmountDepositedInWeirollWallet',
            [marketHash, wallet, token],
          )
        ).totalAmountDeposited as unknown as BigNumber,
    ),
  );
}

export async function getBalances(
  provider: StaticJsonRpcProvider,
  chainId: number,
  wallet: string,
  tokens: string[],
): Promise<BigNumber[]> {
  const tokenInterface = new Interface(['function balanceOf(address owner) external view returns (uint256 amount)']);
  return Promise.all(
    tokens.map(
      async (token) =>
        (await call(provider, tokenInterface, token, 'balanceOf', [wallet])).amount as unknown as BigNumber,
    ),
  );
}

export async function getWeirollWallets(
  provider: StaticJsonRpcProvider,
  chainId: number,
  marketHash: string,
): Promise<AddressArg[]> {
  const depositExecutorInterface = new Interface([
    'function getWeirollWalletByCcdmNonce(bytes32 marketHash, uint256 ccdmNonce) external view returns (address wallet)',
    'event CCDMBridgeProcessed(bytes32 indexed sourceMarketHash, uint256 indexed ccdmNonce, bytes32 indexed guid, address weirollWallet)',
  ]);
  const roles = getSimulationRolesByChainId(chainId);
  const depositExecutor = roles.depositExecutor.address!;

  const filter = {
    address: depositExecutor,
    topics: [depositExecutorInterface.getEventTopic('CCDMBridgeProcessed'), marketHash],
    fromBlock: 0,
    toBlock: 'latest',
  };
  // All params except for the weiroll wallet address are indexed so that is all that is present in the log data,
  // which we can simply decode using getWeirollWalletByCcdmNonce because it has the same return value
  const wallets = (await provider.getLogs(filter)).map(
    (l) => depositExecutorInterface.decodeFunctionResult('getWeirollWalletByCcdmNonce', l.data).wallet,
  );
  return [...new Set(wallets)];
}
