import * as sentryContext from '../sentry.context';
import { loadEnv, unload } from '../secrets';
import { Transaction } from '../entities/ITransaction';
import { Logger } from '../logging';
import { transactionsDiscoveryService } from '../transactions/transactions-discovery.service';
import { parseNumberOrNull } from '../helpers';

const logger = Logger.get('TRANSACTIONS_LOOP');

export const handler = sentryContext.wrapLambdaHandler(async () => {
  await loadEnv([Transaction]);
  logger.info('[RUNNING]');
  const contract = process.env.TRANSACTIONS_CONTRACT_ADDRESS as string;
  if (!contract) {
    throw new Error('TRANSACTIONS_CONTRACT_ADDRESS env variable is not set');
  }

  const startingBlock = parseNumberOrNull(
    process.env.TRANSACTIONS_LOOP_START_BLOCK
  );
  await transactionsDiscoveryService.getAndSaveTransactionsForContract(
    contract,
    startingBlock
  );
  await unload();
  logger.info('[COMPLETE]');
});
