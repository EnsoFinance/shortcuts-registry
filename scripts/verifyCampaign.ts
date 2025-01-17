import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  buildShortcutsHashMap,
  buildVerificationHash,
  getCampaign,
  getCampaignVerificationHash,
  getChainId,
  getRpcUrlByChainId,
} from '../src/helpers';

async function main() {
  try {
    const args: string[] = process.argv.slice(2);

    if (args.length < 2) throw 'Error: Please pass chain and marketHash';
    const chain = args[0];
    const marketHash = args[1];

    const chainId = getChainId(chain);
    if (!chainId) throw 'Error: Unknown chain';

    const rpcUrl = getRpcUrlByChainId(chainId);
    const provider = new StaticJsonRpcProvider(rpcUrl);

    const campaign = await getCampaign(provider, chainId, marketHash);
    const { verified, receiptToken, depositRecipe } = campaign;
    if (verified) {
      console.log('Market is already verified');
    } else {
      console.log('Market is not yet verified');
    }
    if (depositRecipe.commands.length === 0) throw 'Error: Cannot verify, recipe not set for market!';

    const verificationHash = buildVerificationHash(receiptToken, depositRecipe);

    const shortcutHashMap = await buildShortcutsHashMap(chainId);
    const shortcut = shortcutHashMap[verificationHash];
    if (!shortcut) throw 'Error: Cannot find shortcut using market hash';
    console.log('Shortcut: ', shortcut.name);

    console.log('Verification Hash: ', verificationHash);
    const campaignVerificationHash = await getCampaignVerificationHash(provider, chainId, marketHash);
    if (verificationHash !== campaignVerificationHash)
      throw `Error: On-chain verification hash (${campaignVerificationHash}) does not match calculated hash!`;
    if (!verified) console.log('Market is ready to be verified');
  } catch (e) {
    console.error(e);
  }
}

main();
