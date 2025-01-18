import { AddressArg, OperationTypes } from '@ensofinance/shortcuts-builder/types';
import { hexDataLength } from '@ethersproject/bytes';
import { id } from '@ethersproject/hash';
import { pack } from '@ethersproject/solidity';

import { BatchFile, SafeTransaction } from '../types';

export function createBatchFile(
  chainId: number,
  safeAddess: AddressArg | undefined,
  transactions: SafeTransaction[],
): BatchFile {
  return addChecksum({
    version: '1.0',
    chainId: String(chainId),
    createdAt: new Date().getTime(),
    meta: {
      name: 'Transactions Batch',
      description: '',
      txBuilderVersion: '1.17.1',
      createdFromSafeAddress: safeAddess || '',
      createdFromOwnerAddress: '',
    },
    transactions: transactions,
  });
}

export function convertTransactions(transactions: [AddressArg, string][]): SafeTransaction[] {
  return transactions.map((t) => ({
    to: t[0],
    value: '0',
    data: t[1],
    contractMethod: null,
    contractInputsValues: null,
  }));
}

export function buildMultiSendTx(transactions: [AddressArg, string][]): string {
  const encodedTxs = transactions.map((tx) => {
    return pack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [OperationTypes.Call, tx[0], 0, hexDataLength(tx[1]), tx[1]],
    );
  });
  return '0x' + encodedTxs.map((t) => t.substring(2)).join('');
}

// Taken from checksum.ts in the Transaction-Builder website and modified to use ethers.js:

// JSON spec does not allow undefined so stringify removes the prop
// That's a problem for calculating the checksum back so this function avoid the issue
/* eslint-disable  @typescript-eslint/no-explicit-any */
export const stringifyReplacer = (_: string, value: any) => (value === undefined ? null : value);

/* eslint-disable  @typescript-eslint/no-explicit-any */
const serializeJSONObject = (json: any): string => {
  if (Array.isArray(json)) {
    return `[${json.map((el) => serializeJSONObject(el)).join(',')}]`;
  }

  if (typeof json === 'object' && json !== null) {
    let acc = '';
    const keys = Object.keys(json).sort();
    acc += `{${JSON.stringify(keys, stringifyReplacer)}`;

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject(json[keys[i]])},`;
    }

    return `${acc}}`;
  }

  return `${JSON.stringify(json, stringifyReplacer)}`;
};

const calculateChecksum = (batchFile: BatchFile): string | undefined => {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta, name: null },
  });
  const sha = id(serialized);

  return sha || undefined;
};

export const addChecksum = (batchFile: BatchFile): BatchFile => {
  return {
    ...batchFile,
    meta: {
      ...batchFile.meta,
      checksum: calculateChecksum(batchFile),
    },
  };
};

export const validateChecksum = (batchFile: BatchFile): boolean => {
  const targetObj = { ...batchFile };
  const checksum = targetObj.meta.checksum;
  delete targetObj.meta.checksum;

  return calculateChecksum(targetObj) === checksum;
};
