import { getShortcut } from "../src/helpers";

async function main() {
    const { shortcut, chainId } = await getShortcut();
    const weirollScript = await shortcut.build(chainId);
    console.log('Weiroll: ', weirollScript);
}

main();