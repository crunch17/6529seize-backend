import { loadEnv, unload } from '../secrets';
// import { Transaction } from '../entities/ITransaction';
// import { transactions } from '../transactionsLoop/index';
import { LabTransaction } from '../entities/ITransaction';
import { transactions } from '../meme_lab';
import { Logger } from '../logging';

const logger = Logger.get('TRANSACTIONS_REPLAY_LOOP');

export const handler = async (event?: any, context?: any) => {
  const fromBlock = 0;
  const toBlock = undefined;
  logger.info(`[RUNNING] [FROM BLOCK ${fromBlock}] [TO BLOCK ${toBlock}]`);
  await loadEnv([LabTransaction]);
  await transactions(fromBlock, toBlock);
  await unload();
  logger.info('[COMPLETE]');
};
