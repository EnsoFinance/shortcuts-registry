import { getShortcut } from '../src/helpers';

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();
    const { script } = await shortcut.build(chainId);
    console.log('Weiroll: ', script);
  } catch (e) {
    console.log(e);
  }
}

main();
