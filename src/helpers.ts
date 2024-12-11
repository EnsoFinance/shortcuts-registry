import { Shortcut } from "../src/types";
import { DolomiteDHoneyShortcut } from "../src/shortcuts/dolomite-dhoney";
import { ChainIds } from "@ensofinance/shortcuts-builder/types";

const shortcuts: Record<string, Shortcut> = {
    'dolomite-dhoney': new DolomiteDHoneyShortcut(),
}

export async function getShortcut() {
    const args: string[] = process.argv.slice(2);
    if (args.length < 2) throw 'Error: Please pass chain and shortcut name';
    const chain = args[0];
    const name = args[1];
    const shortcut = shortcuts[name];
    if (!shortcut) throw 'Error: Unknown shortcut';
    const chainId = getChainId(chain);
    if (!chainId) throw 'Error: Unknown chain';
    return {shortcut, chainId}
}

function getChainId(chainName: string) {
    chainName = chainName.toLowerCase() // ensure consistent
    const key = (chainName.charAt(0).toUpperCase() + chainName.slice(1)) as keyof typeof ChainIds;
    return ChainIds[key];
}