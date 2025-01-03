import fs from 'fs';
import path from 'path';

import { ShortcutOutputFormat } from '../src/constants';
import { getShortcut, getShortcutOutputFormatFromArgs, hashContent } from '../src/helpers';
import { Output, RoycoOutput } from '../src/types';
import { buildRoycoMarketShortcut } from '../src/utils';

export async function main_(args: string[]) {
  try {
    const protocol = args[1];
    const market = args[2];

    const { shortcut, chainId } = await getShortcut(args);
    const outputFmt = getShortcutOutputFormatFromArgs(args);
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

    console.log(output, '\n');

    if ([ShortcutOutputFormat.FULL].includes(outputFmt)) return;

    // Save output to file in ROYCO format
    const outputHash = hashContent(JSON.stringify(output, null, 2));
    const outputDir = path.join(__dirname, '../outputs', protocol);
    const outputFile = path.join(outputDir, `${market}.json`);

    if (fs.existsSync(outputFile)) {
      const existingOutput = fs.readFileSync(outputFile, 'utf-8');
      const existingHash = hashContent(existingOutput);
      if (existingHash === outputHash) {
        console.log(`Output file '${outputFile}' already exists and is up-to-date`);
        return;
      }
    }
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Output saved to '${outputFile}'`);
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  await main_(process.argv.slice(2));
}

main();
