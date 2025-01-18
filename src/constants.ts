import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';
import { GeneralAddresses, TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { BigNumber } from '@ethersproject/bignumber';

import type { SimulationRoles } from './types';

export const PRECISION = BigNumber.from(10).pow(18);

export enum SimulationMode {
  ANVIL = 'anvil',
  FORGE = 'forge',
  QUOTER = 'quoter',
  TENDERLY = 'tenderly',
}

export enum ShortcutOutputFormat {
  ROYCO = 'royco',
  FULL = 'full',
}

export enum ShortcutExecutionMode {
  WEIROLL_WALLET__EXECUTE_WEIROLL = 'weirollWallet__executeWeiroll',
  MULTICALL__AGGREGATE = 'multiCall__aggregate',
}

// Forge test
export enum ForgeTestLogFormat {
  DEFAULT = '',
  JSON = '--json',
}

export enum TraceItemPhase {
  DEPLOYMENT = 'Deployment',
  EXECUTION = 'Execution',
  SETUP = 'Setup',
}

export const FUNCTION_ID_ERC20_APPROVE = '0x095ea7b3';

export const DEFAULT_SETTER_MIN_AMOUNT_OUT = BigNumber.from('1');
export const MAX_BPS = BigNumber.from('10000'); // NB: 100%
export const MIN_BPS = BigNumber.from('0');
export const DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE = MIN_BPS; // NB: 0%

export const CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI = [
  {
    type: 'event',
    name: 'SimulationReportDust',
    inputs: [
      { name: 'tokensDust', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDust', type: 'uint256[]', indexed: false, internalType: 'uint256[]' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportGasUsed',
    inputs: [{ name: 'gasUsed', type: 'uint256', indexed: false, internalType: 'uint256' }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportQuote',
    inputs: [
      { name: 'tokensOut', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsOut', type: 'uint256[]', indexed: false, internalType: 'uint256[]' },
    ],
    anonymous: false,
  },
];

export const chainIdToSimulationRoles: Map<ChainIds, SimulationRoles> = new Map([
  [
    ChainIds.Cartio,
    {
      caller: {
        address: '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11',
        label: 'Caller',
      },
      defaultWeirollWallet: {
        address: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        label: 'WeirollWallet',
      },
      recipeMarketHub: {
        address: '0x65a605E074f9Efc26d9Cf28CCdbC532B94772056',
        label: 'RecipeMarketHub',
      },
      multiCall: {
        address: '0x58142bd85E67C40a7c0CCf2e1EEF6eB543617d2A',
        label: 'MultiCall',
      },
      roycoWalletHelpers: {
        address: '0x07899ac8BE7462151d6515FCd4773DD9267c9911',
        label: 'RoycoWalletHelpers',
      },
      setter: {
        address: '0x67D0B6e109b82B51706dC4D71B42Bf19CdFC8d1e',
        label: 'CCDMSetter',
      },
      nativeToken: {
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        label: 'NativeToken',
      },
      depositExecutor: {
        address: '0x17621de23Ff8Ad9AdDd82077B0C13c3472367382',
        label: 'DepositExecutor',
      },
    },
  ],
]);

export const chainIdToDeFiAddresses: Record<number, Record<string, AddressArg>> = {
  [ChainIds.Cartio]: {
    ausdt: TokenAddresses.cartio.usdt,
    btg: TokenAddresses.cartio.btg,
    burr: TokenAddresses.cartio.burr,
    dweth: '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3',
    ebtc: TokenAddresses.cartio.ebtc,
    honey: TokenAddresses.cartio.honey,
    mim: TokenAddresses.cartio.mim,
    nativeToken: GeneralAddresses.nativeToken,
    nect: TokenAddresses.cartio.nect,
    pumpbtc: TokenAddresses.cartio.pumpBtc,
    rusd: TokenAddresses.cartio.rusd,
    sbtc: '0x5d417e7798208E9285b5157498bBF23A23E421E7',
    stone: TokenAddresses.cartio.stone,
    usdc: TokenAddresses.cartio.usdc,
    usdt: TokenAddresses.cartio.usdt,
    wbera: TokenAddresses.cartio.wbera,
    wbtc: TokenAddresses.cartio.wbtc,
    weth: TokenAddresses.cartio.weth,
    beraEth: Standards.Dinero_Beraeth.protocol.addresses!.cartio!.beraEth,
    rBeraEth: Standards.Dinero_Beraeth.protocol.addresses!.cartio!.rBeraEth,
    honeyFactory: Standards.Berachain_Honey.protocol.addresses!.cartio!.honeyFactory,
    kodiakRouter: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    kodiakQuoterV2: Standards.Kodiak_Islands.protocol.addresses!.cartio!.quoterV2,
    burrbearZap: '0xd39e7aa57CB0703cE74Bc96dA005dFceE2Ac4F56',
  },
};

const tokenToHolderCartio: Map<AddressArg, AddressArg> = new Map([
  [chainIdToDeFiAddresses[ChainIds.Cartio].nativeToken, '0x0000000000000000000000000000000000000000'], // Native Token (funded via `vm.deal(<address>, 1_000 ether)`)
  [chainIdToDeFiAddresses[ChainIds.Cartio].ausdt, '0xCACa41c458f48D4d7c710F2E62AEe931E149A37d'], // aUSDT
  [chainIdToDeFiAddresses[ChainIds.Cartio].bgt, '0x211bE45338B7C6d5721B5543Eb868547088Aca39'], // BGT
  [chainIdToDeFiAddresses[ChainIds.Cartio].burr, '0x5B34eBA09e567d37884c0AA58509119c87Bfb589'], // BURR
  // [
  //   chainIdToDeFiAddresses[ChainIds.Cartio].dweth,
  //   '0x0000000000000000000000000000000000000000',
  // ], // dWETH (no holder found)
  [chainIdToDeFiAddresses[ChainIds.Cartio].ebtc, '0x895614c89beC7D11454312f740854d08CbF57A78'], // eBTC
  [chainIdToDeFiAddresses[ChainIds.Cartio].honey, '0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75'], // HONEY
  [chainIdToDeFiAddresses[ChainIds.Cartio].mim, '0xB734c264F83E39Ef6EC200F99550779998cC812d'], // MIM
  [chainIdToDeFiAddresses[ChainIds.Cartio].nect, '0xd137593CDB341CcC78426c54Fb98435C60Da193c'], // NECTAR
  [chainIdToDeFiAddresses[ChainIds.Cartio].pumpbtc, '0xD3b050b548dDfdf90d39421fC5eaaF2653165Ad6'], // pumpBTC
  [chainIdToDeFiAddresses[ChainIds.Cartio].rusd, '0xA51C5F0007d8C506E9F7132dF10d637379a07be0'], // rUSD
  [chainIdToDeFiAddresses[ChainIds.Cartio].sbtc, '0xA3A771A7c4AFA7f0a3f88Cc6512542241851C926'], // SBTC
  [chainIdToDeFiAddresses[ChainIds.Cartio].stone, '0xAfa6405c1ea4727a0f9AF9096bD20A1E6d19C153'], // STONE
  [chainIdToDeFiAddresses[ChainIds.Cartio].usdc, '0xCACa41c458f48D4d7c710F2E62AEe931E149A37d'], // USDC
  [chainIdToDeFiAddresses[ChainIds.Cartio].wbera, '0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33'], // WBERA
  [chainIdToDeFiAddresses[ChainIds.Cartio].wbtc, '0x603C6152DF404CB5250Ce8E6FE01e4294254F728'], // WBTC
  [chainIdToDeFiAddresses[ChainIds.Cartio].weth, '0x8a73D1380345942F1cb32541F1b19C40D8e6C94B'], // WETH
]);

export const chainIdToTokenHolder: Map<ChainIds, Map<AddressArg, AddressArg>> = new Map([
  [ChainIds.Cartio, tokenToHolderCartio],
]);
