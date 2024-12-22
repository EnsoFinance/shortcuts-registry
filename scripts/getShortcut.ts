import fs from 'fs';
import path from 'path';

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

    const market = process.argv[4];
    const protocol = process.argv[3];

    const outputDir = path.join(__dirname, '../outputs', protocol);
    const outputFile = path.join(outputDir, `${market}.json`);

    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Output saved to ${outputFile}`);
  } catch (e) {
    console.error(e);
  }
}

main();
