import { ShortcutOutputFormat } from '../src/constants';
import { getShortcut, getShortcutOutputFormatFromArgs } from '../src/helpers';
import { Output, RoycoOutput } from '../src/types';
import { buildRoycoMarketShortcut } from '../src/utils';

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();
    const outputFmt = getShortcutOutputFormatFromArgs(process.argv);
    let output: RoycoOutput | Output;
    switch (outputFmt) {
      case ShortcutOutputFormat.ROYCO:
        output = await buildRoycoMarketShortcut(shortcut, chainId);
        break;
      case ShortcutOutputFormat.FULL:
        output = await shortcut.build(chainId);
        break;
      default:
        throw new Error(`Unsupported '--output=' format: ${outputFmt}`);
    }
    console.log(output);
  } catch (e) {
    console.log(e);
  }
}

main();
