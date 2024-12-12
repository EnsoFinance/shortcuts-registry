import { getShortcut } from '../src/helpers';

async function main() {
    try {
        const { shortcut, chainId } = await getShortcut();
        const weirollScript = await shortcut.build(chainId);
        console.log('Weiroll: ', weirollScript);
    } catch (e) {
        console.log(e);
    }
}

main();
