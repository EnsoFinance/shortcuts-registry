import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ethersproject/address';

export enum SimulationMode {
  ANVIL = 'anvil',
  FORGE = 'forge',
  QUOTER = 'quoter',
  TENDERLY = 'tenderly',
}

const tokenToHolderCartio: Map<AddressArg, AddressArg> = new Map([
  [
    getAddress('0x164A2dE1bc5dc56F329909F7c97Bae929CaE557B') as AddressArg,
    '0xCACa41c458f48D4d7c710F2E62AEe931E149A37d',
  ], // aUSDT
  [
    getAddress('0x289274787bAF083C15A45a174b7a8e44F0720660') as AddressArg,
    '0x211bE45338B7C6d5721B5543Eb868547088Aca39',
  ], // BGT
  [
    getAddress('0x1aF00782F74DdC4c7fCEFe8752113084FEBCDA45') as AddressArg,
    '0x5B34eBA09e567d37884c0AA58509119c87Bfb589',
  ], // BURR
  [
    getAddress('0xd137593CDB341CcC78426c54Fb98435C60Da193c') as AddressArg,
    '0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75',
  ], // HONEY
  [
    getAddress('0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63') as AddressArg,
    '0xB734c264F83E39Ef6EC200F99550779998cC812d',
  ], // MIM
  [
    getAddress('0xefEeD4d987F6d1dE0f23D116a578402456819C28') as AddressArg,
    '0xd137593CDB341CcC78426c54Fb98435C60Da193c',
  ], // NECTAR
  [
    getAddress('0x254e3D5F964E770F3a51a19d809bcE36308d797d') as AddressArg,
    '0xA51C5F0007d8C506E9F7132dF10d637379a07be0',
  ], // rUSD
  [
    getAddress('0x1da4dF975FE40dde074cBF19783928Da7246c515') as AddressArg,
    '0xAfa6405c1ea4727a0f9AF9096bD20A1E6d19C153',
  ], // STONE
  [
    getAddress('0x015fd589F4f1A33ce4487E12714e1B15129c9329') as AddressArg,
    '0xCACa41c458f48D4d7c710F2E62AEe931E149A37d',
  ], // USDC
  [
    getAddress('0x6969696969696969696969696969696969696969') as AddressArg,
    '0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33',
  ], // WBERA
  [
    getAddress('0xFa5bf670A92AfF186E5176aA55690E0277010040') as AddressArg,
    '0x603C6152DF404CB5250Ce8E6FE01e4294254F728',
  ], // WBTC
  [
    getAddress('0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3') as AddressArg,
    '0x8a73D1380345942F1cb32541F1b19C40D8e6C94B',
  ], // WETH
  [
    getAddress('0x3aD1699779eF2c5a4600e649484402DFBd3c503C') as AddressArg,
    '0x0cc03066a3a06F3AC68D3A0D36610F52f7C20877',
  ], // 50_WBERA/50_HONEY WEIGHTED
  [
    getAddress('0x4f9D20770732F10dF42921EFfA62eb843920a48A') as AddressArg,
    '0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75',
  ], // 80_WBERA/20_USDC WEIGHTED
  [
    getAddress('0xF7F214A9543c1153eF5DF2edCd839074615F248c') as AddressArg,
    '0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33',
  ], // USDC/HONEY COMPOSABLESTABLE
  [
    getAddress('0xA694a92a1e23b8AaEE6b81EdF5302f7227e7F274') as AddressArg,
    '0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33',
  ], // USDT/HONEY COMPOSABLESTABLE
]);

export const chainIdToTokenHolder: Map<ChainIds, Map<AddressArg, AddressArg>> = new Map([
  [ChainIds.Cartio, tokenToHolderCartio],
]);
