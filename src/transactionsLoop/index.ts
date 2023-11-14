import { fetchLatestTransactionsBlockNumber, persistTransactions } from '../db';
import { findTransactions } from '../transactions';
import { findTransactionValues, runValues } from '../transaction_values';
import { discoverEns } from '../ens';
import { loadEnv, unload } from '../secrets';
import { Transaction } from '../entities/ITransaction';
import { User } from '../entities/IUser';
import { Logger } from '../logging';

const logger = Logger.get('TRANSACTIONS_LOOP');

export const handler = async (event?: any, context?: any) => {
  await loadEnv([Transaction, User]);
  logger.info('[RUNNING]');
  await transactionsLoop();
  await unload();
  logger.info('[COMPLETE]');
};

export const handlerValues = async (event?: any, context?: any) => {
  await loadEnv();
  logger.info('[RUNNING TRANSACTIONS VALUES]');
  await runValues();
  logger.info('[TRANSACTIONS VALUES COMPLETE]');
};

export async function transactionsLoop() {
  const now = new Date();
  await transactions();
  await discoverEns(now);
}

export async function transactions(
  startingBlock?: number,
  latestBlock?: number,
  pagKey?: string
) {
  try {
    let startingBlockResolved;
    if (startingBlock == undefined) {
      startingBlockResolved = await fetchLatestTransactionsBlockNumber();
    } else {
      startingBlockResolved = startingBlock;
    }

    const response = await findTransactions(
      startingBlockResolved,
      latestBlock,
      pagKey
    );

    const transactionsWithValues = await findTransactionValues(
      response.transactions
    );

    await persistTransactions(transactionsWithValues);

    if (response.pageKey) {
      await transactions(
        startingBlockResolved,
        response.latestBlock,
        response.pageKey
      );
    }
  } catch (e: any) {
    logger.error('[TRANSACTIONS] [ETIMEDOUT!] [RETRYING PROCESS]', e);
    await transactions(startingBlock, latestBlock, pagKey);
  }
}
