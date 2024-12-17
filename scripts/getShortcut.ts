import { getShortcut } from '../src/helpers';

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();
    const output = await shortcut.build(chainId);
    console.log(output);
  } catch (e) {
    console.log(e);
  }
}

main();
