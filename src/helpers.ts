import { Shortcut } from "../src/types";
import { ChainIds } from "@ensofinance/shortcuts-builder/types";
import { DolomiteDHoneyShortcut } from "./shortcuts/dolomite/dhoney";
import { KodiakHoneyUsdcShortcut } from "./shortcuts/kodiak/honey-usdc";
import { DolomiteDUsdcShortcut } from "./shortcuts/dolomite/dusdc";

const shortcuts: Record<string, Record<string, Shortcut>> = {
  "dolomite": {
    "dhoney": new DolomiteDHoneyShortcut(),
    "dusdc": new DolomiteDUsdcShortcut(),
  },
  "kodiak": {
    "honey-usdc": new KodiakHoneyUsdcShortcut(),
  },
};

export async function getShortcut() {
  const args: string[] = process.argv.slice(2);
  if (args.length < 3) throw "Error: Please pass chain, protocol, and market";
  const chain = args[0];
  const protocol = args[1];
  const market = args[2];
  const shortcut = shortcuts[protocol]?.[market];
  if (!shortcut) throw "Error: Unknown shortcut";
  const chainId = getChainId(chain);
  if (!chainId) throw "Error: Unknown chain";
  return { shortcut, chainId };
}

function getChainId(chainName: string) {
  chainName = chainName.toLowerCase(); // ensure consistent
  const key = (chainName.charAt(0).toUpperCase() +
    chainName.slice(1)) as keyof typeof ChainIds;
  return ChainIds[key];
}
