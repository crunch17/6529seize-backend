import { ConsolidatedTDH, TDHENS } from './entities/ITDH';
import { OwnerMetric } from './entities/IOwner';
import { areEqualAddresses, formatDateAsString } from './helpers';
import { SIX529_MUSEUM } from './constants';
import converter from 'json-2-csv';
import {
  fetchAllTDH,
  fetchAllOwnerMetrics,
  fetchLastUpload,
  persistTdhUpload,
  fetchAllConsolidatedTdh,
  persistConsolidatedTdhUpload,
  fetchLastConsolidatedUpload
} from './db';
import { Logger } from './logging';

const logger = Logger.get('TDH_CONSOLIDATION');

const Arweave = require('arweave');

const myarweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

export async function uploadTDH(force?: boolean) {
  const tdh: TDHENS[] = await fetchAllTDH();
  const ownerMetrics: OwnerMetric[] = await fetchAllOwnerMetrics();

  const block = tdh[0].block;
  const dateString = formatDateAsString(new Date());

  const lastUpload = await fetchLastUpload();

  const exists = lastUpload && lastUpload.date == dateString;

  if (!exists || force) {
    logger.info(
      `[BLOCK ${block}] [TDH ${tdh.length}] [OWNER METRICS ${ownerMetrics.length}]`
    );

    const tdhProcessed = tdh.map((tdh) => {
      const {
        date,
        memes_balance_season1,
        memes_balance_season2,
        memes_balance_season3,
        ...rest
      } = tdh;
      if (!rest.ens) {
        if (areEqualAddresses(rest.wallet, SIX529_MUSEUM)) {
          rest.ens = '6529Museum';
        } else {
          rest.ens = '';
        }
      }
      return rest;
    });

    const ownerMetricProcessed = ownerMetrics.map((om) => {
      const { balance, ...rest } = om;
      return rest;
    });

    const combinedArray = tdhProcessed.reduce(
      (combined: any[], tdhProcessed) => {
        const ownerMetric = ownerMetricProcessed.find((om) =>
          areEqualAddresses(om.wallet, tdhProcessed.wallet)
        );
        if (ownerMetric) {
          combined.push({ ...tdhProcessed, ...ownerMetric });
        }
        return combined;
      },
      []
    );

    combinedArray.sort((a, b) => a.tdh_rank - b.tdh_rank);

    logger.info(`[CREATING CSV]`);

    const csv = await converter.json2csvAsync(combinedArray);

    const size = csv.length / (1024 * 1024);
    logger.info(`[CSV CREATED - SIZE ${size.toFixed(2)} MB]`);

    const arweaveKey = process.env.ARWEAVE_KEY
      ? JSON.parse(process.env.ARWEAVE_KEY)
      : {};

    const transaction = await myarweave.createTransaction(
      { data: Buffer.from(csv) },
      arweaveKey
    );

    transaction.addTag('Content-Type', 'text/csv');

    logger.info(`[SIGNING ARWEAVE TRANSACTION]`);

    await myarweave.transactions.sign(transaction, arweaveKey);

    const uploader = await myarweave.transactions.getUploader(transaction);

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      logger.info(
        `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
      );
    }

    const url = `https://arweave.net/${transaction.id}`;

    await persistTdhUpload(
      block,
      dateString,
      `https://arweave.net/${transaction.id}`
    );

    logger.info(`[ARWEAVE LINK ${url}]`);
  } else {
    logger.info(
      `[TODAY'S UPLOAD ALREADY EXISTS AT ${lastUpload.tdh}] [SKIPPING...]`
    );
  }
}

export async function uploadConsolidatedTDH(force?: boolean) {
  const tdh: ConsolidatedTDH[] = await fetchAllConsolidatedTdh();
  const ownerMetrics: OwnerMetric[] = await fetchAllOwnerMetrics();

  const block = tdh[0].block;
  const dateString = formatDateAsString(new Date());

  const lastUpload = await fetchLastConsolidatedUpload();

  const exists = lastUpload && lastUpload.date == dateString;

  if (!exists || force) {
    logger.info(
      `[BLOCK ${block}] [TDH ${tdh.length}] [OWNER METRICS ${ownerMetrics.length}]`
    );

    const tdhProcessed = tdh.map((tdh) => {
      const {
        date,
        memes_balance_season1,
        memes_balance_season2,
        memes_balance_season3,
        ...rest
      } = tdh;
      if (!rest.consolidation_display && rest.wallets.length == 1) {
        if (areEqualAddresses(rest.wallets[0], SIX529_MUSEUM)) {
          rest.consolidation_display = '6529Museum';
        }
      }
      return rest;
    });

    const ownerMetricProcessed = ownerMetrics.map((om) => {
      const { balance, ...rest } = om;
      return rest;
    });

    const combinedArray = tdhProcessed.reduce(
      (combined: any[], tdhProcessed) => {
        const ownerMetrics = [...ownerMetricProcessed].filter((om) =>
          tdhProcessed.wallets.some((w: string) =>
            areEqualAddresses(w, om.wallet)
          )
        );
        if (ownerMetrics.length > 0) {
          combined.push({ ...tdhProcessed, ...ownerMetrics[0] });
        }
        return combined;
      },
      []
    );

    combinedArray.sort((a, b) => a.tdh_rank - b.tdh_rank);

    logger.info(`[CONSOLIDATED TDH UPLOAD] [CREATING CSV]`);

    const csv = await converter.json2csvAsync(combinedArray);

    logger.info(`[CONSOLIDATED TDH UPLOAD] [CSV CREATED]`);

    const arweaveKey = process.env.ARWEAVE_KEY
      ? JSON.parse(process.env.ARWEAVE_KEY)
      : {};

    const transaction = await myarweave.createTransaction(
      { data: Buffer.from(csv) },
      arweaveKey
    );

    transaction.addTag('Content-Type', 'text/csv');

    logger.info(`[CONSOLIDATED TDH UPLOAD] [SIGNING ARWEAVE TRANSACTION]`);

    await myarweave.transactions.sign(transaction, arweaveKey);

    const uploader = await myarweave.transactions.getUploader(transaction);

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      logger.info(
        `[CONSOLIDATED TDH UPLOAD] ${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
      );
    }

    const url = `https://arweave.net/${transaction.id}`;

    await persistConsolidatedTdhUpload(
      block,
      dateString,
      `https://arweave.net/${transaction.id}`
    );

    logger.info(`[CONSOLIDATED TDH UPLOAD] [ARWEAVE LINK ${url}]`);
  } else {
    logger.info(
      `[CONSOLIDATED TDH UPLOAD] [TODAY'S UPLOAD ALREADY EXISTS AT ${lastUpload.tdh}] [SKIPPING...]`
    );
  }
}
