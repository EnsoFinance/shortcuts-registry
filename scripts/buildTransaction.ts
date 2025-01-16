import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import fs from 'fs';
import path from 'path';

import { DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE, MAX_BPS, MIN_BPS, SimulationMode } from '../src/constants';
import {
  buildShortcutsHashMap,
  buildVerificationHash,
  getBalances,
  getBasisPointsFromArgs,
  getCampaign,
  getCampaignVerificationHash,
  getChainId,
  getRpcUrlByChainId,
  getSafeAddressFromArgs,
  getSimulationRolesByChainId,
  getTotalTokenAmountDeposited,
  getWeirollWallets,
} from '../src/helpers';
import { createBatchFile } from '../src/helpers';
import { generateSetterCallData, getSetters } from '../src/helpers/simulate';
import { SafeTransaction } from '../src/types';

const depositExecutorInterface = new Interface([
  'function executeDepositRecipes(bytes32 _sourceMarketHash, address[] calldata _weirollWallets) external',
]);

async function main() {
  try {
    const args: string[] = process.argv.slice(2);

    const safeAddress = getSafeAddressFromArgs(args);
    const setterArgsBps: Record<string, BigNumber> = {
      slippage: DEFAULT_MIN_AMOUNT_OUT_MIN_SLIPPAGE,
      skewRatio: MAX_BPS,
      minAmount0Bps: MIN_BPS,
      minAmount1Bps: MIN_BPS,
    };
    // adjust default values with user inputted values
    Object.keys(setterArgsBps).forEach((key) => {
      setterArgsBps[key] = getBasisPointsFromArgs(args, key, setterArgsBps[key].toString());
    });

    if (args.length < 2) throw 'Error: Please pass chain and marketHash';
    const chain = args[0];
    const marketHash = args[1];

    const chainId = getChainId(chain);
    if (!chainId) throw 'Error: Unknown chain';

    const rpcUrl = getRpcUrlByChainId(chainId);
    const provider = new StaticJsonRpcProvider(rpcUrl);

    const campaign = await getCampaign(provider, chainId, marketHash);
    const { verified, receiptToken, depositRecipe } = campaign;
    if (!verified) {
      console.log('Error: Market is not verified');
    }
    const preVerificationHash = buildVerificationHash(depositRecipe, receiptToken, []);

    const shortcutHashMap = await buildShortcutsHashMap(chainId);
    const shortcut = shortcutHashMap[preVerificationHash];
    if (!shortcut) throw 'Error: Cannot find shortcut using market hash';
    console.log('Shortcut: ', shortcut.name);
    // confirm verification hash
    const { metadata, script } = await shortcut.build(chainId);
    const verificationHash = buildVerificationHash(depositRecipe, receiptToken, metadata.tokensIn!);

    console.log('Verification Hash: ', verificationHash);
    const campaignVerificationHash = await getCampaignVerificationHash(provider, chainId, marketHash);
    if (verificationHash !== campaignVerificationHash)
      throw `Error: On-chain verification hash (${campaignVerificationHash}) does not match calculated hash!`;

    const wallets = await getWeirollWallets(provider, chainId, marketHash);
    if (wallets.length == 0) throw 'Error: No assets have been bridged';

    const [depositedAmounts, actualAmounts] = await Promise.all([
      Promise.all(
        wallets.map((wallet) =>
          getTotalTokenAmountDeposited(provider, chainId, marketHash, wallet, metadata.tokensIn!),
        ),
      ),
      Promise.all(wallets.map((wallet) => getBalances(provider, chainId, wallet, metadata.tokensIn!))),
    ]);

    const walletsWithAmounts = wallets
      .map((wallet, index) => ({ wallet, amountsIn: actualAmounts[index].map((a) => a.toString()) }))
      .filter((wallet, index) => !isWalletExecuted(depositedAmounts[index], actualAmounts[index]));
    if (walletsWithAmounts.length == 0) throw 'Error: All wallets have been executed';

    // Get the first wallet in list that has not been executed
    const { wallet, amountsIn } = walletsWithAmounts.splice(0, 1)[0];
    if (walletsWithAmounts.length > 0)
      console.log(
        'Ignoring the following wallets: ',
        walletsWithAmounts.map((w) => w.wallet),
      );
    console.log(`Building transaction for ${wallet}...`);

    //const amountsIn = ['2500000000000000', '10000000'];
    console.log('Amounts in: ', amountsIn);

    const roles = getSimulationRolesByChainId(chainId);
    const setters = await getSetters(
      shortcut,
      chainId,
      script,
      amountsIn,
      metadata.tokensIn!,
      metadata.tokensOut!,
      setterArgsBps,
      rpcUrl,
      roles,
      SimulationMode.QUOTER,
    );
    const { setterData, safeTransactions } = await generateSetterCallData(
      shortcut.setterInputs![chainId],
      roles.setter.address!,
      setters,
    );
    // Setup executeDepositRecipes call
    const depositExecutor = roles.depositExecutor.address!;
    const method = 'executeDepositRecipes';
    const data = depositExecutorInterface.encodeFunctionData(method, [marketHash, [wallet]]);

    setterData.push([depositExecutor, data]);

    const safeTransaction: SafeTransaction = {
      to: depositExecutor,
      data: null,
      value: '0',
      contractMethod: {
        name: method,
        inputs: [
          {
            name: '_sourceMarketHash',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: '_weirollWallets',
            type: 'address[]',
            internalType: 'address[]',
          },
        ],
        payable: false,
      },
      contractInputsValues: {
        _sourceMarketHash: marketHash,
        _weirollWallets: `[${wallet}]`,
      },
    };
    safeTransactions.push(safeTransaction);

    const outputFile = path.join(__dirname, '../transaction-builder.json');

    fs.writeFileSync(
      outputFile,
      JSON.stringify(createBatchFile(chainId, safeAddress, safeTransactions), null, 2),
      'utf-8',
    );
    console.log(`Safe Transaction Builder output saved to '${outputFile}'`);
  } catch (e) {
    console.error(e);
  }
}

function isWalletExecuted(depositedAmounts: BigNumber[], actualAmounts: BigNumber[]): boolean {
  for (const i in depositedAmounts) {
    if (depositedAmounts[i].gt(actualAmounts[i])) {
      return true;
    }
  }
  return false;
}

main();
