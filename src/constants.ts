import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';
import { GeneralAddresses, TokenAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { getAddress } from '@ethersproject/address';

import type { SimulationRoles } from './types';

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

export const FUNCTION_ID_ERC20_APPROVE = '0x095ea7b3';

export const chainIdToSimulationRoles: Map<ChainIds, SimulationRoles> = new Map([
  [
    ChainIds.Cartio,
    {
      caller: {
        address: getAddress('0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11') as AddressArg,
        label: 'Caller',
      },
      recipeMarketHub: {
        address: getAddress('0x65a605E074f9Efc26d9Cf28CCdbC532B94772056') as AddressArg,
        label: 'RecipeMarketHub',
      },
      multiCall: {
        address: getAddress('0x58142bd85E67C40a7c0CCf2e1EEF6eB543617d2A') as AddressArg,
        label: 'MultiCall',
      },
      roycoWalletHelpers: {
        address: getAddress('0x07899ac8BE7462151d6515FCd4773DD9267c9911') as AddressArg,
        label: 'RoycoWalletHelpers',
      },
      setter: {
        address: getAddress('0x67D0B6e109b82B51706dC4D71B42Bf19CdFC8d1e') as AddressArg,
        label: 'CCDMSetter',
      },
      nativeToken: {
        address: getAddress('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') as AddressArg,
        label: 'NativeToken',
      },
    },
  ],
]);

export const chainIdToDeFiAddresses: Record<number, Record<string, AddressArg>> = {
  [ChainIds.Cartio]: {
    ausdt: getAddress(TokenAddresses.cartio.usdt) as AddressArg,
    bgt: getAddress(TokenAddresses.cartio.bgt) as AddressArg,
    burr: getAddress(TokenAddresses.cartio.burr) as AddressArg,
    dweth: getAddress('0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3') as AddressArg,
    ebtc: getAddress(TokenAddresses.cartio.ebtc) as AddressArg,
    honey: getAddress(TokenAddresses.cartio.honey) as AddressArg,
    mim: getAddress(TokenAddresses.cartio.mim) as AddressArg,
    nativeToken: getAddress(GeneralAddresses.nativeToken) as AddressArg,
    nect: getAddress(TokenAddresses.cartio.nect) as AddressArg,
    pumpbtc: getAddress(TokenAddresses.cartio.pumpBtc) as AddressArg,
    rusd: getAddress(TokenAddresses.cartio.rusd) as AddressArg,
    sbtc: getAddress('0x5d417e7798208E9285b5157498bBF23A23E421E7') as AddressArg,
    stone: getAddress(TokenAddresses.cartio.stone) as AddressArg,
    usdc: getAddress(TokenAddresses.cartio.usdc) as AddressArg,
    usdt: getAddress(TokenAddresses.cartio.usdt) as AddressArg,
    wbera: getAddress(TokenAddresses.cartio.wbera) as AddressArg,
    wbtc: getAddress(TokenAddresses.cartio.wbtc) as AddressArg,
    weth: getAddress(TokenAddresses.cartio.weth) as AddressArg,
    honeyFactory: Standards.Berachain_Honey.protocol.addresses!.cartio!.honeyFactory,
    kodiakRouter: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    kodiakQuoterV2: getAddress(Standards.Kodiak_Islands.protocol.addresses!.cartio!.quoterV2) as AddressArg,
  },
};

const tokenToHolderCartio: Map<AddressArg, AddressArg> = new Map([
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].nativeToken,
    getAddress('0x0000000000000000000000000000000000000000') as AddressArg,
  ], // Native Token (funded via `vm.deal(<address>, 1_000 ether)`)
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].ausdt,
    getAddress('0xCACa41c458f48D4d7c710F2E62AEe931E149A37d') as AddressArg,
  ], // aUSDT
  [chainIdToDeFiAddresses[ChainIds.Cartio].bgt, getAddress('0x211bE45338B7C6d5721B5543Eb868547088Aca39') as AddressArg], // BGT
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].burr,
    getAddress('0x5B34eBA09e567d37884c0AA58509119c87Bfb589') as AddressArg,
  ], // BURR
  // [
  //   chainIdToDeFiAddresses[ChainIds.Cartio].dweth,
  //   getAddress('0x0000000000000000000000000000000000000000') as AddressArg,
  // ], // dWETH (no holder found)
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].ebtc,
    getAddress('0x895614c89beC7D11454312f740854d08CbF57A78') as AddressArg,
  ], // eBTC
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].honey,
    getAddress('0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75') as AddressArg,
  ], // HONEY
  [chainIdToDeFiAddresses[ChainIds.Cartio].mim, getAddress('0xB734c264F83E39Ef6EC200F99550779998cC812d') as AddressArg], // MIM
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].nect,
    getAddress('0xd137593CDB341CcC78426c54Fb98435C60Da193c') as AddressArg,
  ], // NECTAR
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].pumpbtc,
    getAddress('0xD3b050b548dDfdf90d39421fC5eaaF2653165Ad6') as AddressArg,
  ], // pumpBTC
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].rusd,
    getAddress('0xA51C5F0007d8C506E9F7132dF10d637379a07be0') as AddressArg,
  ], // rUSD
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].sbtc,
    getAddress('0xA3A771A7c4AFA7f0a3f88Cc6512542241851C926') as AddressArg,
  ], // SBTC
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].stone,
    getAddress('0xAfa6405c1ea4727a0f9AF9096bD20A1E6d19C153') as AddressArg,
  ], // STONE
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].usdc,
    getAddress('0xCACa41c458f48D4d7c710F2E62AEe931E149A37d') as AddressArg,
  ], // USDC
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].wbera,
    getAddress('0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33') as AddressArg,
  ], // WBERA
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].wbtc,
    getAddress('0x603C6152DF404CB5250Ce8E6FE01e4294254F728') as AddressArg,
  ], // WBTC
  [
    chainIdToDeFiAddresses[ChainIds.Cartio].weth,
    getAddress('0x8a73D1380345942F1cb32541F1b19C40D8e6C94B') as AddressArg,
  ], // WETH
]);

export const chainIdToTokenHolder: Map<ChainIds, Map<AddressArg, AddressArg>> = new Map([
  [ChainIds.Cartio, tokenToHolderCartio],
]);
