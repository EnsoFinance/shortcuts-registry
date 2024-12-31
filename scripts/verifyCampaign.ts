import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  buildShortcutsHashMap,
  getCampaign,
  getChainId,
  getRpcUrlByChainId,
  getVerificationHash,
  getWeirollWallets,
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
    const { receiptToken, depositRecipe } = campaign;
    if (depositRecipe.commands.length === 0) throw 'Error: Cannot verify, recipe not set for market!';

    const hash = getVerificationHash(depositRecipe, receiptToken, []);
    console.log('Hash: ', hash);

    const shortcutHashMap = await buildShortcutsHashMap(chainId);
    const shortcut = shortcutHashMap[hash];
    if (!shortcut) throw 'Error: Cannot find shortcut using market hash';
    console.log('Shortcut found: ', shortcut.name);
    const wallets = await getWeirollWallets(provider, chainId, marketHash);
    console.log('Wallets: ', wallets);
  } catch (e) {
    console.error(e);
  }
}

main();
