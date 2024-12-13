import { Shortcut } from "../src/types";
import { ChainIds } from "@ensofinance/shortcuts-builder/types";
import { DolomiteDHoneyShortcut } from "./shortcuts/dolomite/dhoney";
import { KodiakHoneyUsdcShortcut } from "./shortcuts/kodiak/honey-usdc";
import { DolomiteDUsdcShortcut } from "./shortcuts/dolomite/dusdc";
import { DolomiteDEthShortcut } from "./shortcuts/dolomite/deth";
import { DolomiteDUsdtShortcut } from "./shortcuts/dolomite/dusdt";
import { DolomiteDWbtcShortcut } from "./shortcuts/dolomite/dwbtc";
import { OrigamiBoycoHoneyShortcut } from "./shortcuts/origami/oboy-HONEY-a";

const shortcuts: Record<string, Record<string, Shortcut>> = {
  "dolomite": {
    "deth": new DolomiteDEthShortcut(),
    "dhoney": new DolomiteDHoneyShortcut(),
    "dusdc": new DolomiteDUsdcShortcut(),
    "dusdt": new DolomiteDUsdtShortcut(),
    "dwbtc": new DolomiteDWbtcShortcut(),
  },
  "kodiak": {
    "honey-usdc": new KodiakHoneyUsdcShortcut(),
  },
  "origami": {
    "oboy-honey": new OrigamiBoycoHoneyShortcut(),
  }
};

export async function getShortcut() {
  const args: string[] = process.argv.slice(2);
  if (args.length < 3) throw "Error: Please pass chain, protocol, and market";
  const chain = args[0];
  const protocol = args[1];
  const market = args[2];

  const chainId = getChainId(chain);
  if (!chainId) throw "Error: Unknown chain";

  const shortcut = shortcuts[protocol]?.[market];
  if (!shortcut) throw "Error: Unknown shortcut";
  
  return { shortcut, chainId };
}

function getChainId(chainName: string) {
  chainName = chainName.toLowerCase(); // ensure consistent
  const key = (chainName.charAt(0).toUpperCase() +
    chainName.slice(1)) as keyof typeof ChainIds;
  return ChainIds[key];
}
