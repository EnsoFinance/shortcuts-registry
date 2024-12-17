import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';

import { getShortcut } from '../src/helpers';

async function main() {
  try {
    const { shortcut, chainId } = await getShortcut();
    const { script, metadata } = await shortcut.build(chainId);
    console.log('Weiroll: ', script);
    console.log('Metadata: ', metadata);
    const preHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256[]', 'uint256', 'tuple(bytes32[], bytes[])'],
        [[], metadata.tokensOut![0], [script.commands, script.state]],
      ),
    );
    console.log('Pre-migration Verification Hash: ', preHash);
    const postHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256[]', 'uint256', 'tuple(bytes32[], bytes[])'],
        [metadata.tokensIn, metadata.tokensOut![0], [script.commands, script.state]],
      ),
    );
    console.log('Post-migration Verification Hash: ', postHash);
  } catch (e) {
    console.log(e);
  }
}

main();
