import { Shortcut } from "../src/types";
import { DolomiteDHoneyShortcut } from "../src/shortcuts/dolomite-dhoney";

const shortcuts: Record<string, Shortcut> = {
    'dolomite-dhoney': new DolomiteDHoneyShortcut(),
}

async function getShortcut() {
    const args: string[] = process.argv.slice(2);
    if (args.length == 0) throw 'Error: Please pass shortcut name';
    const name = args[0];
    const shortcut = shortcuts[name];
    if (!shortcut) throw 'Error: Unknown shortcut';
    return shortcut
}

async function main() {
    const shortcut = await getShortcut();
    const weirollScript = await shortcut.build();
    console.log('Weiroll: ', weirollScript);
    // TODO: figure out simulation
}

main();