import {
  GRADIENT_CONTRACT,
  MANIFOLD,
  MEME_8_BURN_TRANSACTION,
  MEMES_CONTRACT,
  NULL_ADDRESS,
  NULL_ADDRESS_DEAD,
  PUNK_6529,
  SZN1_INDEX,
  SZN2_INDEX,
  SZN3_INDEX,
  SZN4_INDEX,
  SZN5_INDEX,
  SZN6_INDEX
} from './constants';
import { ConsolidatedOwnerMetric, OwnerMetric } from './entities/IOwner';
import { Transaction } from './entities/ITransaction';
import {
  areEqualAddresses,
  buildConsolidationKey,
  isNullAddress
} from './helpers';
import {
  fetchAllOwnerMetrics,
  fetchConsolidationDisplay,
  fetchDistinctOwnerWallets,
  fetchLastOwnerMetrics,
  fetchTransactionAddressesFromDate,
  fetchWalletTransactions,
  persistConsolidatedOwnerMetrics,
  persistOwnerMetrics,
  retrieveWalletConsolidations
} from './db';
import { Logger } from './logging';
import { fetchNextgenTokens } from './nextgen/nextgen.db';
import { NextGenToken } from './entities/INextGen';
import {
  getNextgenNetwork,
  NEXTGEN_CORE_CONTRACT
} from './nextgen/nextgen_constants';

const logger = Logger.get('OWNER_METRICS');

export const consolidateOwnerMetrics = async (startingWallets?: string[]) => {
  const consolidatedMetrics: ConsolidatedOwnerMetric[] = [];
  const processedWallets = new Set<string>();
  const allOwnerMetrics = await fetchAllOwnerMetrics();

  const myOwnerMetrics =
    startingWallets && startingWallets.length > 0
      ? allOwnerMetrics.filter((om) =>
          startingWallets.some((sw) => areEqualAddresses(om.wallet, sw))
        )
      : allOwnerMetrics;

  logger.info(
    `[OWNERS METRICS] [CONSOLIDATING ${myOwnerMetrics.length} WALLETS]`
  );

  for (const metric of myOwnerMetrics) {
    const wallet = metric.wallet.toLowerCase();
    const consolidations = await retrieveWalletConsolidations(wallet);
    const display = await fetchConsolidationDisplay(consolidations);
    const consolidationKey = buildConsolidationKey(consolidations);

    if (
      !Array.from(processedWallets).some((pw) => areEqualAddresses(wallet, pw))
    ) {
      const consolidatedWalletsMetrics = [...allOwnerMetrics].filter((t) =>
        consolidations.some((c) => areEqualAddresses(c, t.wallet))
      );

      let balance = 0;
      let memes_balance = 0;
      let memes_balance_season1 = 0;
      let memes_balance_season2 = 0;
      let memes_balance_season3 = 0;
      let memes_balance_season4 = 0;
      let memes_balance_season5 = 0;
      let memes_balance_season6 = 0;
      let gradients_balance = 0;
      let nextgen_balance = 0;
      let purchases_value = 0;
      let purchases_count = 0;
      let purchases_value_memes = 0;
      let purchases_count_memes = 0;
      let purchases_value_memes_season1 = 0;
      let purchases_count_memes_season1 = 0;
      let purchases_value_memes_season2 = 0;
      let purchases_count_memes_season2 = 0;
      let purchases_value_memes_season3 = 0;
      let purchases_count_memes_season3 = 0;
      let purchases_value_memes_season4 = 0;
      let purchases_count_memes_season4 = 0;
      let purchases_value_memes_season5 = 0;
      let purchases_count_memes_season5 = 0;
      let purchases_value_memes_season6 = 0;
      let purchases_count_memes_season6 = 0;
      let purchases_value_gradients = 0;
      let purchases_count_gradients = 0;
      let purchases_value_nextgen = 0;
      let purchases_count_nextgen = 0;
      let purchases_value_primary = 0;
      let purchases_count_primary = 0;
      let purchases_value_primary_memes = 0;
      let purchases_count_primary_memes = 0;
      let purchases_value_primary_memes_season1 = 0;
      let purchases_count_primary_memes_season1 = 0;
      let purchases_value_primary_memes_season2 = 0;
      let purchases_count_primary_memes_season2 = 0;
      let purchases_value_primary_memes_season3 = 0;
      let purchases_count_primary_memes_season3 = 0;
      let purchases_value_primary_memes_season4 = 0;
      let purchases_count_primary_memes_season4 = 0;
      let purchases_value_primary_memes_season5 = 0;
      let purchases_count_primary_memes_season5 = 0;
      let purchases_value_primary_memes_season6 = 0;
      let purchases_count_primary_memes_season6 = 0;
      let purchases_value_primary_gradients = 0;
      let purchases_count_primary_gradients = 0;
      let purchases_value_primary_nextgen = 0;
      let purchases_count_primary_nextgen = 0;
      let purchases_value_secondary = 0;
      let purchases_count_secondary = 0;
      let purchases_value_secondary_memes = 0;
      let purchases_count_secondary_memes = 0;
      let purchases_value_secondary_memes_season1 = 0;
      let purchases_count_secondary_memes_season1 = 0;
      let purchases_value_secondary_memes_season2 = 0;
      let purchases_count_secondary_memes_season2 = 0;
      let purchases_value_secondary_memes_season3 = 0;
      let purchases_count_secondary_memes_season3 = 0;
      let purchases_value_secondary_memes_season4 = 0;
      let purchases_count_secondary_memes_season4 = 0;
      let purchases_value_secondary_memes_season5 = 0;
      let purchases_count_secondary_memes_season5 = 0;
      let purchases_value_secondary_memes_season6 = 0;
      let purchases_count_secondary_memes_season6 = 0;
      let purchases_value_secondary_gradients = 0;
      let purchases_count_secondary_gradients = 0;
      let purchases_value_secondary_nextgen = 0;
      let purchases_count_secondary_nextgen = 0;
      let sales_value = 0;
      let sales_count = 0;
      let sales_value_memes = 0;
      let sales_count_memes = 0;
      let sales_value_memes_season1 = 0;
      let sales_count_memes_season1 = 0;
      let sales_value_memes_season2 = 0;
      let sales_count_memes_season2 = 0;
      let sales_value_memes_season3 = 0;
      let sales_count_memes_season3 = 0;
      let sales_value_memes_season4 = 0;
      let sales_count_memes_season4 = 0;
      let sales_value_memes_season5 = 0;
      let sales_count_memes_season5 = 0;
      let sales_value_memes_season6 = 0;
      let sales_count_memes_season6 = 0;
      let sales_value_gradients = 0;
      let sales_count_gradients = 0;
      let sales_value_nextgen = 0;
      let sales_count_nextgen = 0;
      let transfers_in = 0;
      let transfers_in_memes = 0;
      let transfers_in_memes_season1 = 0;
      let transfers_in_memes_season2 = 0;
      let transfers_in_memes_season3 = 0;
      let transfers_in_memes_season4 = 0;
      let transfers_in_memes_season5 = 0;
      let transfers_in_memes_season6 = 0;
      let transfers_in_gradients = 0;
      let transfers_in_nextgen = 0;
      let transfers_out = 0;
      let transfers_out_memes = 0;
      let transfers_out_memes_season1 = 0;
      let transfers_out_memes_season2 = 0;
      let transfers_out_memes_season3 = 0;
      let transfers_out_memes_season4 = 0;
      let transfers_out_memes_season5 = 0;
      let transfers_out_memes_season6 = 0;
      let transfers_out_gradients = 0;
      let transfers_out_nextgen = 0;

      consolidatedWalletsMetrics.forEach((com) => {
        balance += com.balance;
        memes_balance += com.memes_balance;
        memes_balance_season1 += com.memes_balance_season1;
        memes_balance_season2 += com.memes_balance_season2;
        memes_balance_season3 += com.memes_balance_season3;
        memes_balance_season4 += com.memes_balance_season4;
        memes_balance_season5 += com.memes_balance_season5;
        memes_balance_season6 += com.memes_balance_season6;
        gradients_balance += com.gradients_balance;
        nextgen_balance += com.nextgen_balance;
        purchases_value += com.purchases_value;
        purchases_count += com.purchases_count;
        purchases_value_memes += com.purchases_value_memes;
        purchases_count_memes += com.purchases_count_memes;
        purchases_value_memes_season1 += com.purchases_value_memes_season1;
        purchases_count_memes_season1 += com.purchases_count_memes_season1;
        purchases_value_memes_season2 += com.purchases_value_memes_season2;
        purchases_count_memes_season2 += com.purchases_count_memes_season2;
        purchases_value_memes_season3 += com.purchases_value_memes_season3;
        purchases_count_memes_season3 += com.purchases_count_memes_season3;
        purchases_value_memes_season4 += com.purchases_value_memes_season4;
        purchases_count_memes_season4 += com.purchases_count_memes_season4;
        purchases_value_memes_season5 += com.purchases_value_memes_season5;
        purchases_count_memes_season5 += com.purchases_count_memes_season5;
        purchases_value_memes_season6 += com.purchases_value_memes_season6;
        purchases_count_memes_season6 += com.purchases_count_memes_season6;
        purchases_value_gradients += com.purchases_value_gradients;
        purchases_count_gradients += com.purchases_count_gradients;
        purchases_value_nextgen += com.purchases_value_nextgen;
        purchases_count_nextgen += com.purchases_count_nextgen;
        purchases_value_primary += com.purchases_value_primary;
        purchases_count_primary += com.purchases_count_primary;
        purchases_value_primary_memes += com.purchases_value_primary_memes;
        purchases_count_primary_memes += com.purchases_count_primary_memes;
        purchases_value_primary_memes_season1 +=
          com.purchases_value_primary_memes_season1;
        purchases_count_primary_memes_season1 +=
          com.purchases_count_primary_memes_season1;
        purchases_value_primary_memes_season2 +=
          com.purchases_value_primary_memes_season2;
        purchases_count_primary_memes_season2 +=
          com.purchases_count_primary_memes_season2;
        purchases_value_primary_memes_season3 +=
          com.purchases_value_primary_memes_season3;
        purchases_count_primary_memes_season3 +=
          com.purchases_count_primary_memes_season3;
        purchases_value_primary_memes_season4 +=
          com.purchases_value_primary_memes_season4;
        purchases_count_primary_memes_season4 +=
          com.purchases_count_primary_memes_season4;
        purchases_value_primary_memes_season5 +=
          com.purchases_value_primary_memes_season5;
        purchases_count_primary_memes_season5 +=
          com.purchases_count_primary_memes_season5;
        purchases_value_primary_memes_season6 +=
          com.purchases_value_primary_memes_season6;
        purchases_count_primary_memes_season6 +=
          com.purchases_count_primary_memes_season6;
        purchases_value_primary_gradients +=
          com.purchases_value_primary_gradients;
        purchases_count_primary_gradients +=
          com.purchases_count_primary_gradients;
        purchases_value_primary_nextgen += com.purchases_value_primary_nextgen;
        purchases_count_primary_nextgen += com.purchases_count_primary_nextgen;
        purchases_value_secondary += com.purchases_value_secondary;
        purchases_count_secondary += com.purchases_count_secondary;
        purchases_value_secondary_memes += com.purchases_value_secondary_memes;
        purchases_count_secondary_memes += com.purchases_count_secondary_memes;
        purchases_value_secondary_memes_season1 +=
          com.purchases_value_secondary_memes_season1;
        purchases_count_secondary_memes_season1 +=
          com.purchases_count_secondary_memes_season1;
        purchases_value_secondary_memes_season2 +=
          com.purchases_value_secondary_memes_season2;
        purchases_count_secondary_memes_season2 +=
          com.purchases_count_secondary_memes_season2;
        purchases_value_secondary_memes_season3 +=
          com.purchases_value_secondary_memes_season3;
        purchases_count_secondary_memes_season3 +=
          com.purchases_count_secondary_memes_season3;
        purchases_value_secondary_memes_season4 +=
          com.purchases_value_secondary_memes_season4;
        purchases_count_secondary_memes_season4 +=
          com.purchases_count_secondary_memes_season4;
        purchases_value_secondary_memes_season5 +=
          com.purchases_value_secondary_memes_season5;
        purchases_count_secondary_memes_season5 +=
          com.purchases_count_secondary_memes_season5;
        purchases_value_secondary_memes_season6 +=
          com.purchases_value_secondary_memes_season6;
        purchases_count_secondary_memes_season6 +=
          com.purchases_count_secondary_memes_season6;
        purchases_value_secondary_gradients +=
          com.purchases_value_secondary_gradients;
        purchases_count_secondary_gradients +=
          com.purchases_count_secondary_gradients;
        purchases_value_secondary_nextgen +=
          com.purchases_value_secondary_nextgen;
        purchases_count_secondary_nextgen +=
          com.purchases_count_secondary_nextgen;
        sales_value += com.sales_value;
        sales_count += com.sales_count;
        sales_value_memes += com.sales_value_memes;
        sales_count_memes += com.sales_count_memes;
        sales_value_memes_season1 += com.sales_value_memes_season1;
        sales_count_memes_season1 += com.sales_count_memes_season1;
        sales_value_memes_season2 += com.sales_value_memes_season2;
        sales_count_memes_season2 += com.sales_count_memes_season2;
        sales_value_memes_season3 += com.sales_value_memes_season3;
        sales_count_memes_season3 += com.sales_count_memes_season3;
        sales_value_memes_season4 += com.sales_value_memes_season4;
        sales_count_memes_season4 += com.sales_count_memes_season4;
        sales_value_memes_season5 += com.sales_value_memes_season5;
        sales_count_memes_season5 += com.sales_count_memes_season5;
        sales_value_memes_season6 += com.sales_value_memes_season6;
        sales_count_memes_season6 += com.sales_count_memes_season6;
        sales_value_gradients += com.sales_value_gradients;
        sales_count_gradients += com.sales_count_gradients;
        sales_value_nextgen += com.sales_value_nextgen;
        sales_count_nextgen += com.sales_count_nextgen;
        transfers_in += com.transfers_in;
        transfers_in_memes += com.transfers_in_memes;
        transfers_in_memes_season1 += com.transfers_in_memes_season1;
        transfers_in_memes_season2 += com.transfers_in_memes_season2;
        transfers_in_memes_season3 += com.transfers_in_memes_season3;
        transfers_in_memes_season4 += com.transfers_in_memes_season4;
        transfers_in_memes_season5 += com.transfers_in_memes_season5;
        transfers_in_memes_season6 += com.transfers_in_memes_season6;
        transfers_in_gradients += com.transfers_in_gradients;
        transfers_in_nextgen += com.transfers_in_nextgen;
        transfers_out += com.transfers_out;
        transfers_out_memes += com.transfers_out_memes;
        transfers_out_memes_season1 += com.transfers_out_memes_season1;
        transfers_out_memes_season2 += com.transfers_out_memes_season2;
        transfers_out_memes_season3 += com.transfers_out_memes_season3;
        transfers_out_memes_season4 += com.transfers_out_memes_season4;
        transfers_out_memes_season5 += com.transfers_out_memes_season5;
        transfers_out_memes_season6 += com.transfers_out_memes_season6;
        transfers_out_gradients += com.transfers_out_gradients;
        transfers_out_nextgen += com.transfers_out_nextgen;
      });

      const consolidation: ConsolidatedOwnerMetric = {
        created_at: new Date(),
        consolidation_display: display,
        consolidation_key: consolidationKey,
        wallets: consolidations,
        balance: balance,
        memes_balance: memes_balance,
        memes_balance_season1: memes_balance_season1,
        memes_balance_season2: memes_balance_season2,
        memes_balance_season3: memes_balance_season3,
        memes_balance_season4: memes_balance_season4,
        memes_balance_season5: memes_balance_season5,
        memes_balance_season6: memes_balance_season6,
        gradients_balance: gradients_balance,
        nextgen_balance: nextgen_balance,
        purchases_value: purchases_value,
        purchases_count: purchases_count,
        purchases_value_memes: purchases_value_memes,
        purchases_count_memes: purchases_count_memes,
        purchases_value_memes_season1: purchases_value_memes_season1,
        purchases_count_memes_season1: purchases_count_memes_season1,
        purchases_value_memes_season2: purchases_value_memes_season2,
        purchases_count_memes_season2: purchases_count_memes_season2,
        purchases_value_memes_season3: purchases_value_memes_season3,
        purchases_count_memes_season3: purchases_count_memes_season3,
        purchases_value_memes_season4: purchases_value_memes_season4,
        purchases_count_memes_season4: purchases_count_memes_season4,
        purchases_value_memes_season5: purchases_value_memes_season5,
        purchases_count_memes_season5: purchases_count_memes_season5,
        purchases_value_memes_season6: purchases_value_memes_season6,
        purchases_count_memes_season6: purchases_count_memes_season6,
        purchases_value_gradients: purchases_value_gradients,
        purchases_count_gradients: purchases_count_gradients,
        purchases_value_nextgen: purchases_value_nextgen,
        purchases_count_nextgen: purchases_count_nextgen,
        purchases_value_primary: purchases_value_primary,
        purchases_count_primary: purchases_count_primary,
        purchases_value_primary_memes: purchases_value_primary_memes,
        purchases_count_primary_memes: purchases_count_primary_memes,
        purchases_value_primary_memes_season1:
          purchases_value_primary_memes_season1,
        purchases_count_primary_memes_season1:
          purchases_count_primary_memes_season1,
        purchases_value_primary_memes_season2:
          purchases_value_primary_memes_season2,
        purchases_count_primary_memes_season2:
          purchases_count_primary_memes_season2,
        purchases_value_primary_memes_season3:
          purchases_value_primary_memes_season3,
        purchases_count_primary_memes_season3:
          purchases_count_primary_memes_season3,
        purchases_value_primary_memes_season4:
          purchases_value_primary_memes_season4,
        purchases_count_primary_memes_season4:
          purchases_count_primary_memes_season4,
        purchases_value_primary_memes_season5:
          purchases_value_primary_memes_season5,
        purchases_count_primary_memes_season5:
          purchases_count_primary_memes_season5,
        purchases_value_primary_memes_season6:
          purchases_value_primary_memes_season6,
        purchases_count_primary_memes_season6:
          purchases_count_primary_memes_season6,
        purchases_value_primary_gradients: purchases_value_primary_gradients,
        purchases_count_primary_gradients: purchases_count_primary_gradients,
        purchases_value_primary_nextgen: purchases_value_primary_nextgen,
        purchases_count_primary_nextgen: purchases_count_primary_nextgen,
        purchases_value_secondary: purchases_value_secondary,
        purchases_count_secondary: purchases_count_secondary,
        purchases_value_secondary_memes: purchases_value_secondary_memes,
        purchases_count_secondary_memes: purchases_count_secondary_memes,
        purchases_value_secondary_memes_season1:
          purchases_value_secondary_memes_season1,
        purchases_count_secondary_memes_season1:
          purchases_count_secondary_memes_season1,
        purchases_value_secondary_memes_season2:
          purchases_value_secondary_memes_season2,
        purchases_count_secondary_memes_season2:
          purchases_count_secondary_memes_season2,
        purchases_value_secondary_memes_season3:
          purchases_value_secondary_memes_season3,
        purchases_count_secondary_memes_season3:
          purchases_count_secondary_memes_season3,
        purchases_value_secondary_memes_season4:
          purchases_value_secondary_memes_season4,
        purchases_count_secondary_memes_season4:
          purchases_count_secondary_memes_season4,
        purchases_value_secondary_memes_season5:
          purchases_value_secondary_memes_season5,
        purchases_count_secondary_memes_season5:
          purchases_count_secondary_memes_season5,
        purchases_value_secondary_memes_season6:
          purchases_value_secondary_memes_season6,
        purchases_count_secondary_memes_season6:
          purchases_count_secondary_memes_season6,
        purchases_value_secondary_gradients:
          purchases_value_secondary_gradients,
        purchases_count_secondary_gradients:
          purchases_count_secondary_gradients,
        purchases_value_secondary_nextgen: purchases_value_secondary_nextgen,
        purchases_count_secondary_nextgen: purchases_count_secondary_nextgen,
        sales_value: sales_value,
        sales_count: sales_count,
        sales_value_memes: sales_value_memes,
        sales_count_memes: sales_count_memes,
        sales_value_memes_season1: sales_value_memes_season1,
        sales_count_memes_season1: sales_count_memes_season1,
        sales_value_memes_season2: sales_value_memes_season2,
        sales_count_memes_season2: sales_count_memes_season2,
        sales_value_memes_season3: sales_value_memes_season3,
        sales_count_memes_season3: sales_count_memes_season3,
        sales_value_memes_season4: sales_value_memes_season4,
        sales_count_memes_season4: sales_count_memes_season4,
        sales_value_memes_season5: sales_value_memes_season5,
        sales_count_memes_season5: sales_count_memes_season5,
        sales_value_memes_season6: sales_value_memes_season6,
        sales_count_memes_season6: sales_count_memes_season6,
        sales_value_gradients: sales_value_gradients,
        sales_count_gradients: sales_count_gradients,
        sales_value_nextgen: sales_value_nextgen,
        sales_count_nextgen: sales_count_nextgen,
        transfers_in: transfers_in,
        transfers_in_memes: transfers_in_memes,
        transfers_in_memes_season1: transfers_in_memes_season1,
        transfers_in_memes_season2: transfers_in_memes_season2,
        transfers_in_memes_season3: transfers_in_memes_season3,
        transfers_in_memes_season4: transfers_in_memes_season4,
        transfers_in_memes_season5: transfers_in_memes_season5,
        transfers_in_memes_season6: transfers_in_memes_season6,
        transfers_in_gradients: transfers_in_gradients,
        transfers_in_nextgen: transfers_in_nextgen,
        transfers_out: transfers_out,
        transfers_out_memes: transfers_out_memes,
        transfers_out_memes_season1: transfers_out_memes_season1,
        transfers_out_memes_season2: transfers_out_memes_season2,
        transfers_out_memes_season3: transfers_out_memes_season3,
        transfers_out_memes_season4: transfers_out_memes_season4,
        transfers_out_memes_season5: transfers_out_memes_season5,
        transfers_out_memes_season6: transfers_out_memes_season6,
        transfers_out_gradients: transfers_out_gradients,
        transfers_out_nextgen: transfers_out_nextgen,
        transaction_reference: new Date()
      };
      consolidatedMetrics.push(consolidation);
    }
    consolidations.forEach((c) => {
      processedWallets.add(c);
    });
  }

  logger.info(`[CONSOLIDATED ENTRIES ${consolidatedMetrics.length}]`);
  await persistConsolidatedOwnerMetrics(consolidatedMetrics, startingWallets);

  return consolidatedMetrics;
};

export const findOwnerMetrics = async (reset?: boolean) => {
  const lastMetricsDate = await fetchLastOwnerMetrics();
  const transactionReference = new Date();

  const nextgenNetwork = getNextgenNetwork();
  const NEXTGEN_CONTRACT = NEXTGEN_CORE_CONTRACT[nextgenNetwork];

  logger.info(
    `[NEXTGEN_NETWORK ${nextgenNetwork}] : [NEXTGEN_CONTRACT ${NEXTGEN_CONTRACT}]`
  );

  const addresses = new Set<string>();
  if (!lastMetricsDate || reset) {
    const ownersNfts = await fetchDistinctOwnerWallets();
    ownersNfts.forEach((o: { wallet: string }) => {
      addresses.add(o.wallet);
    });
    const nextgenOwners: NextGenToken[] = await fetchNextgenTokens();
    nextgenOwners.forEach((n) => {
      addresses.add(n.owner);
    });
  } else {
    const allTransactionAddresses: {
      from_address: string;
      to_address: string;
    }[] = await fetchTransactionAddressesFromDate(
      [MEMES_CONTRACT, GRADIENT_CONTRACT],
      new Date(lastMetricsDate)
    );
    allTransactionAddresses.forEach((wallet) => {
      addresses.add(wallet.from_address);
      addresses.add(wallet.to_address);
    });
    addresses.add(NULL_ADDRESS);
    addresses.add(NULL_ADDRESS_DEAD);
  }

  const owners: { wallet: string }[] = Array.from(addresses).map((address) => {
    return { wallet: address };
  });

  logger.info(
    `[OWNERS ${owners.length}] [lastMetricsDate ${lastMetricsDate}] [transactionReference ${transactionReference}] [RESET ${reset}]`
  );

  const ownerMetrics: OwnerMetric[] = [];

  await Promise.all(
    owners.map(async (owner) => {
      const wallet = owner.wallet;

      let walletTransactions: Transaction[] = await fetchWalletTransactions(
        wallet
      );

      if (isNullAddress(wallet)) {
        walletTransactions.forEach((wt) => {
          wt.value = 0;
        });
      }

      if (areEqualAddresses(wallet, NULL_ADDRESS)) {
        logger.info(
          `[WALLET ${wallet}] [SKIPPING MEME CARD 8 BURN TRANSACTION ${MEME_8_BURN_TRANSACTION}]`
        );
        walletTransactions = walletTransactions.filter(
          (t) => !areEqualAddresses(t.transaction, MEME_8_BURN_TRANSACTION)
        );
      }

      if (walletTransactions.length > 0) {
        const transactionsIn = [...walletTransactions].filter((wt) =>
          areEqualAddresses(wt.to_address, wallet)
        );
        const transactionsOut = [...walletTransactions].filter((wt) =>
          areEqualAddresses(wt.from_address, wallet)
        );
        const memesTransactionsIn = [...transactionsIn].filter((tr) =>
          areEqualAddresses(tr.contract, MEMES_CONTRACT)
        );
        const memesTransactionsOut = [...transactionsOut].filter((tr) =>
          areEqualAddresses(tr.contract, MEMES_CONTRACT)
        );
        const memesTransactionsInSeason1 = [...memesTransactionsIn].filter(
          (tr) =>
            SZN1_INDEX.end >= tr.token_id && tr.token_id >= SZN1_INDEX.start
        );
        const memesTransactionsOutSeason1 = [...memesTransactionsOut].filter(
          (tr) =>
            SZN1_INDEX.end >= tr.token_id && tr.token_id >= SZN1_INDEX.start
        );
        const memesTransactionsInSeason2 = [...memesTransactionsIn].filter(
          (tr) =>
            SZN2_INDEX.end >= tr.token_id && tr.token_id >= SZN2_INDEX.start
        );
        const memesTransactionsOutSeason2 = [...memesTransactionsOut].filter(
          (tr) =>
            SZN2_INDEX.end >= tr.token_id && tr.token_id >= SZN2_INDEX.start
        );
        const memesTransactionsInSeason3 = [...memesTransactionsIn].filter(
          (tr) =>
            SZN3_INDEX.end >= tr.token_id && tr.token_id >= SZN3_INDEX.start
        );
        const memesTransactionsOutSeason3 = [...memesTransactionsOut].filter(
          (tr) =>
            SZN3_INDEX.end >= tr.token_id && tr.token_id >= SZN3_INDEX.start
        );
        const memesTransactionsInSeason4 = [...memesTransactionsIn].filter(
          (tr) =>
            SZN4_INDEX.end >= tr.token_id && tr.token_id >= SZN4_INDEX.start
        );
        const memesTransactionsOutSeason4 = [...memesTransactionsOut].filter(
          (tr) =>
            SZN4_INDEX.end >= tr.token_id && tr.token_id >= SZN4_INDEX.start
        );
        const memesTransactionsInSeason5 = [...memesTransactionsIn].filter(
          (tr) =>
            SZN5_INDEX.end >= tr.token_id && tr.token_id >= SZN5_INDEX.start
        );
        const memesTransactionsOutSeason5 = [...memesTransactionsOut].filter(
          (tr) =>
            SZN5_INDEX.end >= tr.token_id && tr.token_id >= SZN5_INDEX.start
        );
        const memesTransactionsInSeason6 = [...memesTransactionsIn].filter(
          (tr) =>
            // SZN6_INDEX.end >= tr.token_id &&
            tr.token_id >= SZN6_INDEX.start
        );
        const memesTransactionsOutSeason6 = [...memesTransactionsOut].filter(
          (tr) =>
            // SZN6_INDEX.end >= tr.token_id &&
            tr.token_id >= SZN6_INDEX.start
        );
        const gradientsTransactionsIn = [...transactionsIn].filter((tr) =>
          areEqualAddresses(tr.contract, GRADIENT_CONTRACT)
        );
        const gradientsTransactionsOut = [...transactionsOut].filter((tr) =>
          areEqualAddresses(tr.contract, GRADIENT_CONTRACT)
        );

        const nextgenTransactionsIn = [...transactionsIn].filter((tr) =>
          areEqualAddresses(tr.contract, NEXTGEN_CONTRACT)
        );
        const nextgenTransactionsOut = [...transactionsOut].filter((tr) =>
          areEqualAddresses(tr.contract, NEXTGEN_CONTRACT)
        );

        const purchases = [...transactionsIn].filter((t) => t.value > 0);
        const purchasesMemes = [...purchases].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const purchasesMemesS1 = [...purchasesMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const purchasesMemesS2 = [...purchasesMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const purchasesMemesS3 = [...purchasesMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const purchasesMemesS4 = [...purchasesMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const purchasesMemesS5 = [...purchasesMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const purchasesMemesS6 = [...purchasesMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );
        const purchasesGradients = [...purchases].filter((t) =>
          areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );
        const purchasesNextgen = [...purchases].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );
        const purchasesPrimary = [...purchases].filter((t) =>
          areEqualAddresses(MANIFOLD, t.from_address)
        );
        const purchasesPrimaryMemes = [...purchasesPrimary].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const purchasesPrimaryMemesS1 = [...purchasesPrimaryMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const purchasesPrimaryMemesS2 = [...purchasesPrimaryMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const purchasesPrimaryMemesS3 = [...purchasesPrimaryMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const purchasesPrimaryMemesS4 = [...purchasesPrimaryMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const purchasesPrimaryMemesS5 = [...purchasesPrimaryMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const purchasesPrimaryMemesS6 = [...purchasesPrimaryMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );
        const purchasesPrimaryGradients = [...purchasesPrimary].filter((t) =>
          areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );
        const purchasesPrimaryNextgen = [...purchasesPrimary].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );

        const purchasesSecondary = [...purchases].filter(
          (t) => !areEqualAddresses(MANIFOLD, t.from_address)
        );
        const purchasesSecondaryMemes = [...purchasesSecondary].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const purchasesSecondaryMemesS1 = [...purchasesSecondaryMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const purchasesSecondaryMemesS2 = [...purchasesSecondaryMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const purchasesSecondaryMemesS3 = [...purchasesSecondaryMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const purchasesSecondaryMemesS4 = [...purchasesSecondaryMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const purchasesSecondaryMemesS5 = [...purchasesSecondaryMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const purchasesSecondaryMemesS6 = [...purchasesSecondaryMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );
        const purchasesSecondaryGradients = [...purchasesSecondary].filter(
          (t) => areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );
        const purchasesSecondaryNextgen = [...purchasesSecondary].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );

        const sales = [...transactionsOut].filter(
          (t) => t.value > 0 && !isPunkGradient(t)
        );
        const salesMemes = [...sales].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const salesMemesS1 = [...salesMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const salesMemesS2 = [...salesMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const salesMemesS3 = [...salesMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const salesMemesS4 = [...salesMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const salesMemesS5 = [...salesMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const salesMemesS6 = [...salesMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );

        const salesGradients = [...sales].filter((t) =>
          areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );

        const salesNextgen = [...sales].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );

        const transfersIn = [...transactionsIn].filter((t) => t.value == 0);
        const transfersInMemes = [...transfersIn].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const transfersInMemesS1 = [...transfersInMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const transfersInMemesS2 = [...transfersInMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const transfersInMemesS3 = [...transfersInMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const transfersInMemesS4 = [...transfersInMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const transfersInMemesS5 = [...transfersInMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const transfersInMemesS6 = [...transfersInMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );
        const transfersInGradients = [...transfersIn].filter((t) =>
          areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );
        const transfersInNextgen = [...transfersIn].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );

        const transfersOut = [...transactionsOut].filter(
          (t) => t.value == 0 || isPunkGradient(t)
        );

        const transfersOutMemes = [...transfersOut].filter((t) =>
          areEqualAddresses(t.contract, MEMES_CONTRACT)
        );
        const transfersOutMemesS1 = [...transfersOutMemes].filter(
          (t) => SZN1_INDEX.end >= t.token_id && t.token_id >= SZN1_INDEX.start
        );
        const transfersOutMemesS2 = [...transfersOutMemes].filter(
          (t) => SZN2_INDEX.end >= t.token_id && t.token_id >= SZN2_INDEX.start
        );
        const transfersOutMemesS3 = [...transfersOutMemes].filter(
          (t) => SZN3_INDEX.end >= t.token_id && t.token_id >= SZN3_INDEX.start
        );
        const transfersOutMemesS4 = [...transfersOutMemes].filter(
          (t) => SZN4_INDEX.end >= t.token_id && t.token_id >= SZN4_INDEX.start
        );
        const transfersOutMemesS5 = [...transfersOutMemes].filter(
          (t) => SZN5_INDEX.end >= t.token_id && t.token_id >= SZN5_INDEX.start
        );
        const transfersOutMemesS6 = [...transfersOutMemes].filter(
          (t) =>
            // SZN6_INDEX.end >= t.token_id &&
            t.token_id >= SZN6_INDEX.start
        );
        const transfersOutGradients = [...transfersOut].filter((t) =>
          areEqualAddresses(t.contract, GRADIENT_CONTRACT)
        );
        const transfersOutNextgen = [...transfersOut].filter((t) =>
          areEqualAddresses(t.contract, NEXTGEN_CONTRACT)
        );

        const ownerMetric: OwnerMetric = {
          created_at: new Date(),
          wallet: wallet,
          balance: getCount(transactionsIn) - getCount(transactionsOut),
          memes_balance:
            getCount(memesTransactionsIn) - getCount(memesTransactionsOut),
          memes_balance_season1:
            getCount(memesTransactionsInSeason1) -
            getCount(memesTransactionsOutSeason1),
          memes_balance_season2:
            getCount(memesTransactionsInSeason2) -
            getCount(memesTransactionsOutSeason2),
          memes_balance_season3:
            getCount(memesTransactionsInSeason3) -
            getCount(memesTransactionsOutSeason3),
          memes_balance_season4:
            getCount(memesTransactionsInSeason4) -
            getCount(memesTransactionsOutSeason4),
          memes_balance_season5:
            getCount(memesTransactionsInSeason5) -
            getCount(memesTransactionsOutSeason5),
          memes_balance_season6:
            getCount(memesTransactionsInSeason6) -
            getCount(memesTransactionsOutSeason6),
          gradients_balance:
            getCount(gradientsTransactionsIn) -
            getCount(gradientsTransactionsOut),
          nextgen_balance:
            getCount(nextgenTransactionsIn) - getCount(nextgenTransactionsOut),
          purchases_value: getValue(purchases),
          purchases_count: getCount(purchases),
          purchases_value_memes: getValue(purchasesMemes),
          purchases_count_memes: getCount(purchasesMemes),
          purchases_value_memes_season1: getValue(purchasesMemesS1),
          purchases_count_memes_season1: getCount(purchasesMemesS1),
          purchases_value_memes_season2: getValue(purchasesMemesS2),
          purchases_count_memes_season2: getCount(purchasesMemesS2),
          purchases_value_memes_season3: getValue(purchasesMemesS3),
          purchases_count_memes_season3: getCount(purchasesMemesS3),
          purchases_value_memes_season4: getValue(purchasesMemesS4),
          purchases_count_memes_season4: getCount(purchasesMemesS4),
          purchases_value_memes_season5: getValue(purchasesMemesS5),
          purchases_count_memes_season5: getCount(purchasesMemesS5),
          purchases_value_memes_season6: getValue(purchasesMemesS6),
          purchases_count_memes_season6: getCount(purchasesMemesS6),
          purchases_value_gradients: getValue(purchasesGradients),
          purchases_count_gradients: getCount(purchasesGradients),
          purchases_value_nextgen: getValue(purchasesNextgen),
          purchases_count_nextgen: getCount(purchasesNextgen),
          purchases_value_primary: getValue(purchasesPrimary),
          purchases_count_primary: getCount(purchasesPrimary),
          purchases_value_primary_memes: getValue(purchasesPrimaryMemes),
          purchases_count_primary_memes: getCount(purchasesPrimaryMemes),
          purchases_value_primary_memes_season1: getValue(
            purchasesPrimaryMemesS1
          ),
          purchases_count_primary_memes_season1: getCount(
            purchasesPrimaryMemesS1
          ),
          purchases_value_primary_memes_season2: getValue(
            purchasesPrimaryMemesS2
          ),
          purchases_count_primary_memes_season2: getCount(
            purchasesPrimaryMemesS2
          ),
          purchases_value_primary_memes_season3: getValue(
            purchasesPrimaryMemesS3
          ),
          purchases_count_primary_memes_season3: getCount(
            purchasesPrimaryMemesS3
          ),
          purchases_value_primary_memes_season4: getValue(
            purchasesPrimaryMemesS4
          ),
          purchases_count_primary_memes_season4: getCount(
            purchasesPrimaryMemesS4
          ),
          purchases_value_primary_memes_season5: getValue(
            purchasesPrimaryMemesS5
          ),
          purchases_count_primary_memes_season5: getCount(
            purchasesPrimaryMemesS5
          ),
          purchases_value_primary_memes_season6: getValue(
            purchasesPrimaryMemesS6
          ),
          purchases_count_primary_memes_season6: getCount(
            purchasesPrimaryMemesS6
          ),
          purchases_value_primary_gradients: getValue(
            purchasesPrimaryGradients
          ),
          purchases_count_primary_gradients: getCount(
            purchasesPrimaryGradients
          ),
          purchases_value_primary_nextgen: getValue(purchasesPrimaryNextgen),
          purchases_count_primary_nextgen: getCount(purchasesPrimaryNextgen),
          purchases_value_secondary: getValue(purchasesSecondary),
          purchases_count_secondary: getCount(purchasesSecondary),
          purchases_value_secondary_memes: getValue(purchasesSecondaryMemes),
          purchases_count_secondary_memes: getCount(purchasesSecondaryMemes),
          purchases_value_secondary_memes_season1: getValue(
            purchasesSecondaryMemesS1
          ),
          purchases_count_secondary_memes_season1: getCount(
            purchasesSecondaryMemesS1
          ),
          purchases_value_secondary_memes_season2: getValue(
            purchasesSecondaryMemesS2
          ),
          purchases_count_secondary_memes_season2: getCount(
            purchasesSecondaryMemesS2
          ),
          purchases_value_secondary_memes_season3: getValue(
            purchasesSecondaryMemesS3
          ),
          purchases_count_secondary_memes_season3: getCount(
            purchasesSecondaryMemesS3
          ),
          purchases_value_secondary_memes_season4: getValue(
            purchasesSecondaryMemesS4
          ),
          purchases_count_secondary_memes_season4: getCount(
            purchasesSecondaryMemesS4
          ),
          purchases_value_secondary_memes_season5: getValue(
            purchasesSecondaryMemesS5
          ),
          purchases_count_secondary_memes_season5: getCount(
            purchasesSecondaryMemesS5
          ),
          purchases_value_secondary_memes_season6: getValue(
            purchasesSecondaryMemesS6
          ),
          purchases_count_secondary_memes_season6: getCount(
            purchasesSecondaryMemesS6
          ),
          purchases_value_secondary_gradients: getValue(
            purchasesSecondaryGradients
          ),
          purchases_count_secondary_gradients: getCount(
            purchasesSecondaryGradients
          ),
          purchases_value_secondary_nextgen: getValue(
            purchasesSecondaryNextgen
          ),
          purchases_count_secondary_nextgen: getCount(
            purchasesSecondaryNextgen
          ),
          sales_value: getValue(sales),
          sales_count: getCount(sales),
          sales_value_memes: getValue(salesMemes),
          sales_count_memes: getCount(salesMemes),
          sales_value_memes_season1: getValue(salesMemesS1),
          sales_count_memes_season1: getCount(salesMemesS1),
          sales_value_memes_season2: getValue(salesMemesS2),
          sales_count_memes_season2: getCount(salesMemesS2),
          sales_value_memes_season3: getValue(salesMemesS3),
          sales_count_memes_season3: getCount(salesMemesS3),
          sales_value_memes_season4: getValue(salesMemesS4),
          sales_count_memes_season4: getCount(salesMemesS4),
          sales_value_memes_season5: getValue(salesMemesS5),
          sales_count_memes_season5: getCount(salesMemesS5),
          sales_value_memes_season6: getValue(salesMemesS6),
          sales_count_memes_season6: getCount(salesMemesS6),
          sales_value_gradients: getValue(salesGradients),
          sales_count_gradients: getCount(salesGradients),
          sales_value_nextgen: getValue(salesNextgen),
          sales_count_nextgen: getCount(salesNextgen),
          transfers_in: getCount(transfersIn),
          transfers_in_memes: getCount(transfersInMemes),
          transfers_in_memes_season1: getCount(transfersInMemesS1),
          transfers_in_memes_season2: getCount(transfersInMemesS2),
          transfers_in_memes_season3: getCount(transfersInMemesS3),
          transfers_in_memes_season4: getCount(transfersInMemesS4),
          transfers_in_memes_season5: getCount(transfersInMemesS5),
          transfers_in_memes_season6: getCount(transfersInMemesS6),
          transfers_in_gradients: getCount(transfersInGradients),
          transfers_in_nextgen: getCount(transfersInNextgen),
          transfers_out: getCount(transfersOut),
          transfers_out_memes: getCount(transfersOutMemes),
          transfers_out_memes_season1: getCount(transfersOutMemesS1),
          transfers_out_memes_season2: getCount(transfersOutMemesS2),
          transfers_out_memes_season3: getCount(transfersOutMemesS3),
          transfers_out_memes_season4: getCount(transfersOutMemesS4),
          transfers_out_memes_season5: getCount(transfersOutMemesS5),
          transfers_out_memes_season6: getCount(transfersOutMemesS6),
          transfers_out_gradients: getCount(transfersOutGradients),
          transfers_out_nextgen: getCount(transfersOutNextgen),
          transaction_reference: transactionReference
        };
        ownerMetrics.push(ownerMetric);
      }
    })
  );

  logger.info(`[OWNERS METRICS] [DELTA ${ownerMetrics.length}]`);
  await persistOwnerMetrics(ownerMetrics, reset);

  await consolidateOwnerMetrics();

  return ownerMetrics;
};

function getCount(arr: any[]) {
  return [...arr].reduce(
    (sum, transaction) => sum + transaction.token_count,
    0
  );
}

function getValue(arr: any[]) {
  return [...arr].reduce((sum, transaction) => sum + transaction.value, 0);
}

function isPunkGradient(t: Transaction) {
  return (
    areEqualAddresses(t.from_address, PUNK_6529) &&
    areEqualAddresses(t.contract, GRADIENT_CONTRACT)
  );
}
