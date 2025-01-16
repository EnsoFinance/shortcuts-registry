import { AddressArg, OperationTypes } from '@ensofinance/shortcuts-builder/types';
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
  getShortcutExecutionMode,
  getSimulationRolesByChainId,
  getTotalTokenAmountDeposited,
  getWeirollWallets,
} from '../src/helpers';
import { createBatchFile } from '../src/helpers';
import { encodeMulticall, generateSetterCallData, getSetters, simulateShortcutOnQuoter } from '../src/helpers/simulate';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../src/simulations/simulateOnQuoter';
import { Report, SafeTransaction } from '../src/types';

const depositExecutorInterface = new Interface([
  'function executeDepositRecipes(bytes32 _sourceMarketHash, address[] calldata _weirollWallets) external',
]);

async function main() {
  try {
    const args: string[] = process.argv.slice(2);

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
    const { owner, verified, receiptToken, depositRecipe } = campaign;
    if (!verified) throw 'Error: Market is not verified';
    const preVerificationHash = buildVerificationHash(depositRecipe, receiptToken, []);

    const shortcutHashMap = await buildShortcutsHashMap(chainId);
    const shortcut = shortcutHashMap[preVerificationHash];
    if (!shortcut) throw 'Error: Cannot find shortcut using market hash';
    console.log('Shortcut: ', shortcut.name);
    // confirm verification hash
    const { metadata, script } = await shortcut.build(chainId);
    const tokensIn = metadata.tokensIn!;
    const tokensOut = metadata.tokensOut!;
    const verificationHash = buildVerificationHash(depositRecipe, receiptToken, tokensIn);

    console.log('Verification Hash: ', verificationHash);
    const campaignVerificationHash = await getCampaignVerificationHash(provider, chainId, marketHash);
    if (verificationHash !== campaignVerificationHash)
      console.log(`Warning: On-chain verification hash (${campaignVerificationHash}) does not match calculated hash!`);

    const wallets = await getWeirollWallets(provider, chainId, marketHash);
    if (wallets.length == 0) throw 'Error: No assets have been bridged';

    const [depositedAmounts, actualAmounts] = await Promise.all([
      Promise.all(
        wallets.map((wallet) => getTotalTokenAmountDeposited(provider, chainId, marketHash, wallet, tokensIn)),
      ),
      Promise.all(wallets.map((wallet) => getBalances(provider, chainId, wallet, tokensIn))),
    ]);

    let walletsWithAmounts = wallets.map((wallet, index) => ({
      wallet,
      balances: actualAmounts[index].map((a) => a.toString()),
      deposits: depositedAmounts[index].map((a) => a.toString()),
    }));

    const filteredWalletsWithAmounts = walletsWithAmounts.filter(
      (wallet) => !isWalletExecuted(wallet.deposits, wallet.balances),
    );
    const useMockWalletAmounts = filteredWalletsWithAmounts.length === 0;
    if (useMockWalletAmounts) {
      console.log(
        "Warning: All wallets have been executed. Attempting to simulate using last wallet's original deposit...",
        '\n',
      );
      walletsWithAmounts = [walletsWithAmounts[walletsWithAmounts.length - 1]];
    } else {
      walletsWithAmounts = filteredWalletsWithAmounts;
    }

    // Get the first wallet in list that has not been executed
    const { wallet, balances, deposits } = walletsWithAmounts.splice(0, 1)[0];
    if (walletsWithAmounts.length > 0)
      console.log(
        'Ignoring the following wallets: ',
        walletsWithAmounts.map((w) => w.wallet),
      );

    const amountsIn = useMockWalletAmounts ? deposits : balances;
    const tokenBalances: Record<string, string> = {};
    for (const i in tokensIn) {
      tokenBalances[tokensIn[i]] = amountsIn[i];
    }
    console.log('Weiroll Wallet Token Balances: ', tokenBalances, '\n');

    const roles = getSimulationRolesByChainId(chainId);
    if (useMockWalletAmounts) {
      await simulateShortcutOnQuoter(
        shortcut,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        setterArgsBps,
        rpcUrl,
        roles,
        getShortcutExecutionMode(shortcut, chainId),
        {
          isReportLogged: true,
          isCalldataLogged: true,
        },
      );
    } else {
      console.log(`Building transaction for ${wallet}...`, '\n');

      const setters = await getSetters(
        shortcut,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        setterArgsBps,
        rpcUrl,
        roles,
        SimulationMode.QUOTER,
      );
      const { setterData, setterInputData, safeTransactions } = await generateSetterCallData(
        shortcut.setterInputs?.[chainId],
        roles.setter.address!,
        setters,
      );

      // Setup executeDepositRecipes call
      const depositExecutor = roles.depositExecutor.address!;
      const method = 'executeDepositRecipes';
      const data = depositExecutorInterface.encodeFunctionData(method, [marketHash, [wallet]]);

      const calls: [AddressArg, string][] = [...setterData, [depositExecutor, data]];

      const isMulticall = calls.length > 1;
      // TODO: check if owner is a safe if there are setter values, throw if it isn't

      // Simulate to confirm that tx would succeed
      let tx: APITransaction;
      if (isMulticall) {
        const data = encodeMulticall(calls);
        tx = {
          from: owner,
          to: roles.multiCall.address!,
          data,
          value: '0',
          receiver: wallet,
          executor: wallet,
          operationType: OperationTypes.DelegateCall,
        };
      } else {
        tx = {
          from: owner,
          to: calls[0][0],
          data: calls[0][1],
          value: '0',
          receiver: wallet,
          executor: wallet,
        };
      }

      const quoteTokens = [...tokensOut, ...tokensIn]; //find dust

      const request: QuoteRequest = {
        chainId,
        transactions: [tx],
        tokenIn: [],
        tokenOut: quoteTokens,
        amountIn: [],
      };

      const quote = (await simulateTransactionOnQuoter(request))[0];
      if (quote.status === 'Error') throw quote.error;
      const minAmountOut = setters.minAmountOut || BigNumber.from(0);
      const report: Report = {
        weirollWallet: wallet,
        amountsIn,
        minAmountOut: minAmountOut.toString(),
        minAmountOutHex: minAmountOut.toHexString(),
        quote: {},
        dust: {},
        gas: quote.gas,
      };

      tokensOut.forEach((t) => {
        const index = quoteTokens.findIndex((q) => q === t);
        report.quote[t] = quote.amountOut[index];
      });
      tokensIn.forEach((t) => {
        const index = quoteTokens.findIndex((q) => q === t);
        report.dust[t] = quote.amountOut[index];
      });

      if (setterData.length > 0) console.log('Setter Input Data:\n', setterInputData, '\n');
      console.log('Calls:\n', calls, '\n');
      console.log('Simulation (Report):\n', report, '\n');

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

      fs.writeFileSync(outputFile, JSON.stringify(createBatchFile(chainId, owner, safeTransactions), null, 2), 'utf-8');
      console.log(`Safe Transaction Builder output saved to '${outputFile}'`);
    }
  } catch (e) {
    console.error(e);
  }
}

function isWalletExecuted(depositedAmounts: string[], actualAmounts: string[]): boolean {
  for (const i in depositedAmounts) {
    if (BigNumber.from(depositedAmounts[i]).gt(actualAmounts[i])) {
      return true;
    }
  }
  return false;
}

main();
