import { AbracadabraMimHoneyhortcut } from '../shortcuts/abracadabra/mim-honey';
import { BeraborrowNectHoneyShortcut } from '../shortcuts/beraborrow/nect-honey';
import { BeraborrowSbtcShortcut } from '../shortcuts/beraborrow/sbtc';
import { BeraborrowWethShortcut } from '../shortcuts/beraborrow/weth';
import { BurrbearUsdcShortcut } from '../shortcuts/burrbear/usdc';
import { ConcreteLbtcShortcut } from '../shortcuts/concrete/lbtc';
import { ConcreteSusdeShortcut } from '../shortcuts/concrete/susde';
import { ConcreteUsdcShortcut } from '../shortcuts/concrete/usdc';
import { ConcreteUsdeShortcut } from '../shortcuts/concrete/usde';
import { ConcreteWethShortcut } from '../shortcuts/concrete/weth';
import { D2UsdcShortcut } from '../shortcuts/d2/usdc';
import { DahliaUsdcShortcut } from '../shortcuts/dahlia/usdc';
import { DahliaWethShortcut } from '../shortcuts/dahlia/weth';
import { DolomiteDEthShortcut } from '../shortcuts/dolomite/deth';
import { DolomiteDHoneyShortcut } from '../shortcuts/dolomite/dhoney';
import { DolomiteDPumpBtcShortcut } from '../shortcuts/dolomite/dpumpbtc';
import { DolomiteDRsEthShortcut } from '../shortcuts/dolomite/drseth';
import { DolomiteDSbtcShortcut } from '../shortcuts/dolomite/dsbtc';
import { DolomiteDUsdcShortcut } from '../shortcuts/dolomite/dusdc';
import { DolomiteDUsdtShortcut } from '../shortcuts/dolomite/dusdt';
import { DolomiteDWbtcShortcut } from '../shortcuts/dolomite/dwbtc';
import { DolomiteDYlPumpBtcShortcut } from '../shortcuts/dolomite/dylpumpbtc';
import { InfraredHoneyUsdcShortcut } from '../shortcuts/infrared/honey-usdc';
import { InfraredWethHoneyShortcut } from '../shortcuts/infrared/weth-honey';
import { InfraredWethWbtcShortcut } from '../shortcuts/infrared/weth-wbtc';
import { KodiakHoneyUsdcShortcut } from '../shortcuts/kodiak/honey-usdc';
import { KodiakWethHoneyShortcut } from '../shortcuts/kodiak/weth-honey';
import { KodiakWethWbtcShortcut } from '../shortcuts/kodiak/weth-wbtc';
import { OrigamiBoycoHoneyShortcut } from '../shortcuts/origami/oboy-HONEY-a';
import { SatlayerLbtcShortcut } from '../shortcuts/satlayer/lbtc';
import { SatlayerPumpBtcShortcut } from '../shortcuts/satlayer/pumpbtc';
import { SatlayerSbtcShortcut } from '../shortcuts/satlayer/sbtc';
import { SatlayerSolvBtcShortcut } from '../shortcuts/satlayer/solvBtc';
import { SatlayerWabtcShortcut } from '../shortcuts/satlayer/wabtc';
import { ThjUsdcShortcut } from '../shortcuts/thj/usdc';
import { Shortcut } from '../types';
import { buildVerificationHash } from './utils';

export const shortcuts: Record<string, Record<string, Shortcut>> = {
  abracadabra: {
    'honey-mim': new AbracadabraMimHoneyhortcut(),
  },
  beraborrow: {
    'nect-honey': new BeraborrowNectHoneyShortcut(),
    sbtc: new BeraborrowSbtcShortcut(),
    weth: new BeraborrowWethShortcut(),
  },
  burrbear: {
    usdc: new BurrbearUsdcShortcut(),
  },
  concrete: {
    usdc: new ConcreteUsdcShortcut(),
    weth: new ConcreteWethShortcut(),
    wbtc: new ConcreteWethShortcut(),
    lbtc: new ConcreteLbtcShortcut(),
    susde: new ConcreteSusdeShortcut(),
    usde: new ConcreteUsdeShortcut(),
  },
  dahlia: {
    usdc: new DahliaUsdcShortcut(),
    weth: new DahliaWethShortcut(),
  },
  dolomite: {
    deth: new DolomiteDEthShortcut(),
    dhoney: new DolomiteDHoneyShortcut(),
    dpumpbtc: new DolomiteDPumpBtcShortcut(),
    drseth: new DolomiteDRsEthShortcut(),
    dsbtc: new DolomiteDSbtcShortcut(),
    dusdc: new DolomiteDUsdcShortcut(),
    dusdt: new DolomiteDUsdtShortcut(),
    dwbtc: new DolomiteDWbtcShortcut(),
    dylpumpbtc: new DolomiteDYlPumpBtcShortcut(),
  },
  d2: {
    usdc: new D2UsdcShortcut(),
  },
  // TODO: uncomment out and move import up once Goldilocks is ready
  // import { GoldilocksEbtcShortcut } from './shortcuts/goldilocks/ebtc';
  // goldilocks: {
  //   ebtc: new GoldilocksEbtcShortcut(),
  // },
  kodiak: {
    'honey-usdc': new KodiakHoneyUsdcShortcut(),
    'weth-honey': new KodiakWethHoneyShortcut(),
    'weth-wbtc': new KodiakWethWbtcShortcut(),
  },
  origami: {
    'oboy-honey': new OrigamiBoycoHoneyShortcut(),
  },
  satlayer: {
    pumpbtc: new SatlayerPumpBtcShortcut(),
    sbtc: new SatlayerSbtcShortcut(),
    lbtc: new SatlayerLbtcShortcut(),
    wabtc: new SatlayerWabtcShortcut(),
    solvbtc: new SatlayerSolvBtcShortcut(),
  },
  infrared: {
    'weth-wbtc': new InfraredWethWbtcShortcut(),
    'honey-usdc': new InfraredHoneyUsdcShortcut(),
    'weth-honey': new InfraredWethHoneyShortcut(),
  },
  thj: {
    usdc: new ThjUsdcShortcut(),
  },
};

export async function buildShortcutsHashMap(chainId: number): Promise<Record<string, Shortcut>> {
  const shortcutsArray = [];
  for (const protocol in shortcuts) {
    for (const market in shortcuts[protocol]) {
      shortcutsArray.push(shortcuts[protocol][market]);
    }
  }
  const hashArray = await Promise.all(
    shortcutsArray.map(async (shortcut) => {
      const { script, metadata } = await shortcut.build(chainId);
      return buildVerificationHash(metadata.tokensOut![0], script);
    }),
  );
  const shortcutsHashMap: Record<string, Shortcut> = {};
  for (const i in shortcutsArray) {
    shortcutsHashMap[hashArray[i]] = shortcutsArray[i];
  }
  return shortcutsHashMap;
}
