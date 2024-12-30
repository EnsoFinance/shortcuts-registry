import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import fs from 'fs';
import path from 'path';

import { getShortcut } from '../src/helpers';

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();

    const output = await shortcut.build(chainId);

    const script = {
      weirollCommands: output.script.commands,
      weirollState: output.script.state,
    };
    console.log('Generated WeiRoll Script:\n', script);

    const verificationHash = getCampaignVerificationHash(
      output.metadata.tokensIn!,
      output.metadata.tokensOut![0],
      '0x' + Buffer.from(JSON.stringify(script), 'utf8').toString('hex'),
    );
    console.log('Verification Hash:\n', verificationHash);

    const market = process.argv[4];
    const protocol = process.argv[3];

    const scriptsDir = path.join(__dirname, '../outputs', protocol);
    const scriptFile = path.join(scriptsDir, `${market}.json`);
    const verificationHashFile = path.join(scriptsDir, `${market}.txt`);

    fs.writeFileSync(scriptFile, JSON.stringify(script, null, 2), 'utf-8');
    fs.writeFileSync(verificationHashFile, JSON.stringify(verificationHash, null, 2), 'utf-8');
    console.log('Output saved to:\n', scriptFile);
  } catch (e) {
    console.error(e);
  }
}

export function getCampaignVerificationHash(
  inputTokens: string[],
  receiptToken: string,
  depositRecipe: string,
): string {
  const encoded = defaultAbiCoder.encode(['address[]', 'address', 'bytes'], [inputTokens, receiptToken, depositRecipe]);
  return keccak256(encoded);
}

main();
