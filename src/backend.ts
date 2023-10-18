import * as overvotesRevocation from './overvotesRevocationLoop';

const transactions = require('./transactionsLoop');
const nfts = require('./nftsLoop');
const owners = require('./ownersLoop');
const memeLab = require('./memeLabLoop');
const tdh = require('./tdhLoop');
const tdhHistory = require('./tdhHistoryLoop');
const team = require('./teamLoop');
const rememes = require('./rememesLoop');
const ownerMetrics = require('./ownerMetricsLoop');
const s3 = require('./s3Loop');
const discoverEnsLoop = require('./discoverEnsLoop');
const refreshEnsLoop = require('./refreshEnsLoop');
const royaltiesLoop = require('./royaltiesLoop');
const delegations = require('./delegationsLoop');
const nftHistory = require('./nftHistoryLoop');

const { memeStats, memeLabStats, gradientStats } = require('./marketStatsLoop');

const cron = require('node-cron');

let RUNNING_START_SCRIPT = true;

function isCronsEnabled() {
  return process.env.CRONS_DISABLES !== 'true' && !RUNNING_START_SCRIPT;
}

// PULL EVERY 4 MINUTES
cron.schedule('*/4 * * * *', async function () {
  if (isCronsEnabled()) {
    nfts.handler();
    owners.handler();
  }
});

// PULL EVERY 3 MINUTES
cron.schedule('*/3 * * * *', async function () {
  if (isCronsEnabled()) {
    transactions.handler();
  }
});

// PULL EVERY 5 MINUTES
cron.schedule('*/5 * * * *', async function () {
  if (isCronsEnabled()) {
    memeLab.handler();
  }
});

// PULL EVERY 4 MINUTES
cron.schedule('*/4 * * * *', async function () {
  if (isCronsEnabled()) {
    ownerMetrics.handler();
  }
});

// PULL EVERY 2 MINUTES
cron.schedule('*/2 * * * *', async function () {
  if (isCronsEnabled()) {
    await delegations.handler();
  }
});

// PULL EVERY 30 MINUTES
cron.schedule('*/30 * * * *', async function () {
  if (isCronsEnabled()) {
    await nftHistory.handler();
  }
});

// PULL EVERY HOUR AT MIN 0
cron.schedule('0 * * * *', async function () {
  if (isCronsEnabled()) {
    // memeStats();
  }
});

// PULL EVERY 2 HOURS AT MIN 15
cron.schedule('15 */2 * * *', async function () {
  if (isCronsEnabled()) {
    // gradientStats();
  }
});

// PULL EVERY HOUR AT MIN 30
cron.schedule('30 * * * *', async function () {
  if (isCronsEnabled()) {
    // memeLabStats();
  }
});

// CALCULATE TDH AT 00:01,00:15,00:30,00:45
cron.schedule('1,15,30,45 0 * * *', async function () {
  if (isCronsEnabled()) {
    await tdh.handler();
    await tdhHistory.handler();
    await overvotesRevocation.handler();
  }
});

// UPLOAD ROYALTIES AT 04:01
cron.schedule('1 4 * * *', async function () {
  if (isCronsEnabled()) {
    await royaltiesLoop.handler();
  }
});

async function start() {
  const now = new Date();
  console.log(
    now,
    `[CONFIG ${process.env.NODE_ENV}]`,
    `[EXECUTING START SCRIPT...]`
  );

  // Uncomment to call on start

  await nftHistory.handler();
  await delegations.handler();
  await transactions.handler();
  await nfts.handler();
  await owners.handler();
  await ownerMetrics.handler();
  // await tdh.handler();
  // await tdhHistory.handler();
  // await memeLab.handler();
  // await memeStats();
  // await gradientStats();
  // await memeLabStats();
  // await s3.handler();
  // await team.handler();
  // await discoverEnsLoop.handler();
  // await refreshEnsLoop.handler();
  // await royaltiesLoop.handler();
  // await transactions.handlerValues();
  // await rememes.handler();
  await overvotesRevocation.handler();

  RUNNING_START_SCRIPT = false;
  console.log(new Date(), `[START SCRIPT COMPLETE]`, `[SERVICE STARTED...]`);
}

start();
