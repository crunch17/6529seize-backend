import { RequestInfo, RequestInit } from 'node-fetch';
import { persistGlobalTDHHistory, persistTDHHistory } from '../db';
import {
  ConsolidatedTDH,
  GlobalTDHHistory,
  TDHHistory,
  TokenTDH
} from '../entities/ITDH';
import {
  areEqualAddresses,
  buildConsolidationKey,
  formatDateAsString
} from '../helpers';
import { loadEnv, unload } from '../secrets';
import axios from 'axios';
import { Readable } from 'stream';
import { Logger } from '../logging';
import { Time } from '../time';
import * as sentryContext from '../sentry.context';

const csvParser = require('csv-parser');

const logger = Logger.get('TDH_HISTORY_LOOP');

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import('node-fetch').then(({ default: fetch }) => fetch(url, init));

export const handler = sentryContext.wrapLambdaHandler(
  async (event?: any, context?: any) => {
    await loadEnv([TDHHistory, GlobalTDHHistory]);
    const iterations = parseInt(process.env.TDH_HISTORY_ITERATIONS ?? '1');
    logger.info(`[RUNNING] [ITERATIONS ${iterations}]`);
    await tdhHistoryLoop(iterations);
    await unload();
    logger.info('[COMPLETE]');
  }
);

async function tdhHistoryLoop(iterations: number) {
  for (let i = iterations - 1; i >= 0; i--) {
    const start = Time.now();
    const myDate = new Date();
    myDate.setDate(myDate.getDate() - i);

    const historyResult = await tdhHistory(myDate);

    await calculateGlobalTDHHistory(
      myDate,
      historyResult.block,
      historyResult.history,
      historyResult.tdh
    );

    logger.info(
      `[DATE ${
        myDate.toISOString().split('T')[0]
      }] [ALL DONE!] [${start.diffFromNow()}]`
    );
  }
}

async function fetchUploads(date: string): Promise<
  {
    date: string;
    block: number;
    url: string;
  }[]
> {
  const uploads = await fetch(
    `https://api.seize.io/api/consolidated_uploads?date=${date}&page_size=5`
  );
  const json = await uploads.json();
  return json.data;
}

async function fetchAndParseCSV(url: string): Promise<any[]> {
  const response = await axios.get(url);
  const csvData: any[] = [];

  return new Promise((resolve, reject) => {
    const readableStream = Readable.from(response.data);
    readableStream
      .pipe(csvParser())
      .on('data', (row: any) => {
        csvData.push(row);
      })
      .on('end', () => {
        resolve(csvData);
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });
}

function matchesConsolidationKey(d: any, yd: any) {
  return (
    areEqualAddresses(d.consolidation_key, yd.consolidation_key) ||
    areEqualAddresses(
      d.consolidation_key,
      buildConsolidationKey(JSON.parse(yd.wallets))
    )
  );
}

function hasMatchingWallet(d: any, yd: any) {
  const ydWallets = JSON.parse(yd.wallets);
  return d.wallets.some((dw: string) =>
    ydWallets.some((yw: string) => areEqualAddresses(dw, yw))
  );
}

async function tdhHistory(date: Date) {
  const dateString = formatDateAsString(date);
  const uploads = await fetchUploads(dateString);

  logger.info(
    `[DATE ${date.toISOString().split('T')[0]}] [FETCHING UPLOADS...]`
  );

  const today = uploads[0];
  const yesterday = uploads[1];

  logger.info({
    message: 'CALCULATING TDH CHANGE',
    from: `${today.date} (BLOCK ${today.block})`,
    from_url: today.url,
    to: `${yesterday.date} (BLOCK ${yesterday.block})`,
    to_url: yesterday.url
  });

  const todayData = await fetchAndParseCSV(today.url);
  const yesterdayData = await fetchAndParseCSV(yesterday.url);

  const tdhHistory: TDHHistory[] = [];

  logger.info(`[DATE ${date.toISOString().split('T')[0]}] [MAPPING...]`);

  const yesterdayEntries: string[] = [];

  todayData.forEach((d) => {
    d.memes = JSON.parse(d.memes);
    d.gradients = JSON.parse(d.gradients);
    d.nextgen = JSON.parse(d.nextgen);
    d.wallets = JSON.parse(d.wallets);
    d.consolidation_key = buildConsolidationKey(d.wallets);

    const yesterdayTdh = yesterdayData.filter(
      (yd) => matchesConsolidationKey(d, yd) || hasMatchingWallet(d, yd)
    );

    if (yesterdayTdh.length > 0) {
      yesterdayTdh.forEach((y) => {
        const wallets = JSON.parse(y.wallets);
        const key = buildConsolidationKey(wallets);
        yesterdayEntries.push(key);
        if (!Array.isArray(y.memes)) {
          y.memes = JSON.parse(y.memes);
        }
        if (!Array.isArray(y.gradients)) {
          y.gradients = JSON.parse(y.gradients);
        }
        if (!Array.isArray(y.nextgen)) {
          y.nextgen = JSON.parse(y.nextgen);
        }
      });
    }

    const memesResult = processTokenTDHArray(
      'memes',
      d.boost,
      d.memes,
      yesterdayTdh
    );
    const gradientsResult = processTokenTDHArray(
      'gradients',
      d.boost,
      d.gradients,
      yesterdayTdh
    );
    const nextgenResult = processTokenTDHArray(
      'nextgen',
      d.boost,
      d.nextgen,
      yesterdayTdh
    );

    const tdhCreated =
      memesResult.tdhCreated +
      gradientsResult.tdhCreated +
      nextgenResult.tdhCreated;
    const tdhDestroyed =
      memesResult.tdhDestroyed +
      gradientsResult.tdhDestroyed +
      nextgenResult.tdhDestroyed;
    const rawTdhCreated =
      memesResult.rawTdhCreated +
      gradientsResult.rawTdhCreated +
      nextgenResult.rawTdhCreated;
    const rawTdhDestroyed =
      memesResult.rawTdhDestroyed +
      gradientsResult.rawTdhDestroyed +
      nextgenResult.rawTdhDestroyed;
    const boostedTdhCreated =
      memesResult.boostedTdhCreated +
      gradientsResult.boostedTdhCreated +
      nextgenResult.boostedTdhCreated;
    const boostedTdhDestroyed =
      memesResult.boostedTdhDestroyed +
      gradientsResult.boostedTdhDestroyed +
      nextgenResult.boostedTdhDestroyed;
    const balanceCreated =
      memesResult.balanceCreated +
      gradientsResult.balanceCreated +
      nextgenResult.balanceCreated;
    const balanceDestroyed =
      memesResult.balanceDestroyed +
      gradientsResult.balanceDestroyed +
      nextgenResult.balanceDestroyed;

    const tdhNet = tdhCreated - tdhDestroyed;
    const rawTdhNet = rawTdhCreated - rawTdhDestroyed;
    const boostedTdhNet = boostedTdhCreated - boostedTdhDestroyed;
    const balanceNet = balanceCreated - balanceDestroyed;

    const tdhH: TDHHistory = {
      date: date,
      consolidation_display: d.consolidation_display,
      consolidation_key: d.consolidation_key,
      wallets: d.wallets,
      block: d.block,
      boosted_tdh: d.boosted_tdh,
      tdh: d.tdh,
      tdh__raw: d.tdh__raw,
      created_tdh: tdhCreated,
      destroyed_tdh: tdhDestroyed,
      net_tdh: tdhNet,
      created_boosted_tdh: boostedTdhCreated,
      destroyed_boosted_tdh: boostedTdhDestroyed,
      net_boosted_tdh: boostedTdhNet,
      created_tdh__raw: rawTdhCreated,
      destroyed_tdh__raw: rawTdhDestroyed,
      net_tdh__raw: rawTdhNet,
      created_balance: balanceCreated,
      destroyed_balance: balanceDestroyed,
      net_balance: balanceNet
    };
    tdhHistory.push(tdhH);
  });

  yesterdayData.forEach((yd) => {
    const wallets = JSON.parse(yd.wallets);
    const key = buildConsolidationKey(wallets);
    if (!yesterdayEntries.includes(key)) {
      logger.info(
        `[DATE ${date.toISOString().split('T')[0]}] [KEY LOST ${key} ${
          yd.boosted_tdh
        } TDH]`
      );

      const ydtdhRaw = parseFloat(yd.tdh__raw);
      const ydtdh = parseFloat(yd.tdh);
      const ydboostedTdh = parseFloat(yd.boosted_tdh);
      const ydbalance = parseFloat(yd.balance);

      const tdhH: TDHHistory = {
        date: date,
        consolidation_display: yd.consolidation_display,
        consolidation_key: key,
        wallets: yd.wallets,
        block: yd.block,
        boosted_tdh: 0,
        tdh: 0,
        tdh__raw: 0,
        created_tdh: 0,
        destroyed_tdh: ydtdh,
        net_tdh: -ydtdh,
        created_boosted_tdh: 0,
        destroyed_boosted_tdh: ydboostedTdh,
        net_boosted_tdh: -ydboostedTdh,
        created_tdh__raw: 0,
        destroyed_tdh__raw: ydtdhRaw,
        net_tdh__raw: -ydtdhRaw,
        created_balance: 0,
        destroyed_balance: ydbalance,
        net_balance: ydbalance
      };
      tdhHistory.push(tdhH);
    }
  });

  logger.info(
    `[DATE ${date.toISOString().split('T')[0]}] [COUNT ${
      tdhHistory.length
    }] [PERSISTNG...]`
  );
  await persistTDHHistory(tdhHistory);

  return {
    block: today.block,
    history: tdhHistory,
    tdh: todayData
  };
}

async function calculateGlobalTDHHistory(
  date: Date,
  block: number,
  tdhHistory: TDHHistory[],
  tdhData: ConsolidatedTDH[]
) {
  logger.info(
    `[DATE ${
      date.toISOString().split('T')[0]
    }] [CALCULATING GLOBAL TDH HISTORY...]`
  );

  let totalCreatedTdh = 0;
  let totalDestroyedTdh = 0;
  let totalNetTdh = 0;
  let totalCreatedBoostedTdh = 0;
  let totalDestroyedBoostedTdh = 0;
  let totalNetBoostedTdh = 0;
  let totalCreatedTdhRaw = 0;
  let totalDestroyedTdhRaw = 0;
  let totalNetTdhRaw = 0;
  let totalCreatedBalance = 0;
  let totalDestroyedBalance = 0;
  let totalNetBalance = 0;

  tdhHistory.forEach((h) => {
    totalCreatedTdh += h.created_tdh;
    totalDestroyedTdh += h.destroyed_tdh;
    totalNetTdh += h.net_tdh;
    totalCreatedBoostedTdh += h.created_boosted_tdh;
    totalDestroyedBoostedTdh += h.destroyed_boosted_tdh;
    totalNetBoostedTdh += h.net_boosted_tdh;
    totalCreatedTdhRaw += h.created_tdh__raw;
    totalDestroyedTdhRaw += h.destroyed_tdh__raw;
    totalNetTdhRaw += h.net_tdh__raw;
    totalCreatedBalance += h.created_balance;
    totalDestroyedBalance += h.destroyed_balance;
    totalNetBalance += h.net_balance;
  });

  let totalBoostedTdh = 0;
  let totalTdh = 0;
  let totalTdhRaw = 0;
  let totalGradientsBoostedTdh = 0;
  let totalGradientsTdh = 0;
  let totalGradientsTdhRaw = 0;
  let totalMemesBoostedTdh = 0;
  let totalMemesTdh = 0;
  let totalMemesTdhRaw = 0;
  let walletsLength = 0;
  let memesLength = 0;
  let gradientsLength = 0;
  let nextgenLength = 0;

  tdhData.forEach((h: any) => {
    totalBoostedTdh += parseFloat(h.boosted_tdh);
    totalTdh += parseFloat(h.tdh);
    totalTdhRaw += parseFloat(h.tdh__raw);
    totalGradientsBoostedTdh += parseFloat(h.boosted_gradients_tdh);
    totalGradientsTdh += parseFloat(h.gradients_tdh);
    totalGradientsTdhRaw += parseFloat(h.gradients_tdh__raw);
    totalMemesBoostedTdh += parseFloat(h.boosted_memes_tdh);
    totalMemesTdh += parseFloat(h.memes_tdh);
    totalMemesTdhRaw += parseFloat(h.memes_tdh__raw);

    walletsLength += h.wallets.length;
    memesLength += h.memes.length;
    gradientsLength += h.gradients.length;
    nextgenLength += h.nextgen?.length ?? 0;
  });

  const consolidationWallets = tdhData.length;

  const globalHistory: GlobalTDHHistory = {
    date: date,
    block,
    created_tdh: totalCreatedTdh,
    destroyed_tdh: totalDestroyedTdh,
    net_tdh: totalNetTdh,
    created_boosted_tdh: totalCreatedBoostedTdh,
    destroyed_boosted_tdh: totalDestroyedBoostedTdh,
    net_boosted_tdh: totalNetBoostedTdh,
    created_tdh__raw: totalCreatedTdhRaw,
    destroyed_tdh__raw: totalDestroyedTdhRaw,
    net_tdh__raw: totalNetTdhRaw,
    created_balance: totalCreatedBalance,
    destroyed_balance: totalDestroyedBalance,
    net_balance: totalNetBalance,
    memes_balance: memesLength,
    gradients_balance: gradientsLength,
    nextgen_balance: nextgenLength,
    total_boosted_tdh: totalBoostedTdh,
    total_tdh: totalTdh,
    total_tdh__raw: totalTdhRaw,
    gradients_boosted_tdh: totalGradientsBoostedTdh,
    gradients_tdh: totalGradientsTdh,
    gradients_tdh__raw: totalGradientsTdhRaw,
    memes_boosted_tdh: totalMemesBoostedTdh,
    memes_tdh: totalMemesTdh,
    memes_tdh__raw: totalMemesTdhRaw,
    total_consolidated_wallets: consolidationWallets,
    total_wallets: walletsLength
  };

  await persistGlobalTDHHistory(globalHistory);
}

function processTokenTDHArray(
  type: string,
  boost: number,
  tokens: TokenTDH[],
  yesterdayTdh: any
) {
  return tokens.reduce(
    (acc, token) => {
      const change = calculateChange(type, yesterdayTdh, token, boost);
      acc.tdhCreated += change.tdhCreated;
      acc.tdhDestroyed += change.tdhDestroyed;
      acc.boostedTdhCreated += change.boostedTdhCreated;
      acc.boostedTdhDestroyed += change.boostedTdhDestroyed;
      acc.rawTdhCreated += change.rawTdhCreated;
      acc.rawTdhDestroyed += change.rawTdhDestroyed;
      acc.balanceCreated += change.balanceCreated;
      acc.balanceDestroyed += change.balanceDestroyed;
      return acc;
    },
    {
      tdhCreated: 0,
      tdhDestroyed: 0,
      boostedTdhCreated: 0,
      boostedTdhDestroyed: 0,
      rawTdhCreated: 0,
      rawTdhDestroyed: 0,
      balanceCreated: 0,
      balanceDestroyed: 0
    }
  );
}

function calculateChange(
  type: string,
  yesterdayTdh: any[],
  m: TokenTDH,
  boost: number
) {
  const existing: any[] = [];
  if (yesterdayTdh) {
    yesterdayTdh.forEach((y) => {
      let yTokens = [];
      if (type === 'memes') {
        yTokens = y.memes;
      } else if (type === 'gradients') {
        yTokens = y.gradients;
      } else if (type === 'nextgen') {
        yTokens = y.nextgen;
      }
      const e = yTokens.find((em: TokenTDH) => em.id == m.id);
      if (e) {
        existing.push({
          ...e,
          boosted_tdh: e.tdh * y.boost
        });
      }
    });
  }

  const previousTdh = {
    id: m.id,
    boosted_tdh: 0,
    tdh: 0,
    tdh__raw: 0,
    balance: 0
  };

  if (existing) {
    existing.forEach((e) => {
      previousTdh.boosted_tdh += e.boosted_tdh;
      previousTdh.tdh += e.tdh;
      previousTdh.tdh__raw += e.tdh__raw;
      previousTdh.balance += e.balance;
    });
  }

  const change = m.tdh - previousTdh.tdh;
  let tdhCreated = 0;
  let tdhDestroyed = 0;
  let boostedTdhCreated = 0;
  let boostedTdhDestroyed = 0;
  let rawTdhCreated = 0;
  let rawTdhDestroyed = 0;
  let balanceCreated = 0;
  let balanceDestroyed = 0;
  if (change > 0) {
    tdhCreated += m.tdh - previousTdh.tdh;
    rawTdhCreated += m.tdh__raw - previousTdh.tdh__raw;
    boostedTdhCreated += m.tdh * boost - previousTdh.boosted_tdh;
    balanceCreated += m.balance - previousTdh.balance;
  } else {
    tdhDestroyed += previousTdh.tdh - m.tdh;
    rawTdhDestroyed += previousTdh.tdh__raw - m.tdh__raw;
    boostedTdhDestroyed += previousTdh.boosted_tdh - m.tdh * boost;
    balanceDestroyed += previousTdh.balance - m.balance;
  }
  return {
    tdhCreated,
    tdhDestroyed,
    boostedTdhCreated,
    boostedTdhDestroyed,
    rawTdhCreated,
    rawTdhDestroyed,
    balanceCreated,
    balanceDestroyed
  };
}
