import { Alchemy } from 'alchemy-sdk';
import { ALCHEMY_SETTINGS } from './constants';
import { ENS } from './entities/IENS';
import {
  fetchEnsRefresh,
  persistENS,
  fetchMissingEns,
  fetchBrokenEnsRefresh,
  fetchMissingEnsDelegations
} from './db';

let alchemy: Alchemy;

async function findExistingEns(ens: ENS[]) {
  console.log(
    new Date(),
    '[ENS EXISTING]',
    `[PROCESSING EXISTING ENS FOR ${ens.length} WALLETS]`
  );

  const deltaEns: ENS[] = [];

  for (const w of ens) {
    try {
      const newDisplay = await alchemy.core.lookupAddress(w.wallet);
      let newDisplayStr = newDisplay;
      if (newDisplay) {
        newDisplayStr = replaceEmojisWithHex(newDisplay);
      }
      const newEns: ENS = {
        created_at: new Date(),
        wallet: w.wallet,
        display: newDisplayStr
      };
      deltaEns.push(newEns);
    } catch (e: any) {
      console.log(
        '[ENS EXISTING]',
        `[ERROR FOR WALLET ${w.wallet}]`,
        e.message
      );
      const newEns: ENS = {
        created_at: new Date(),
        wallet: w.wallet,
        display: null
      };
      deltaEns.push(newEns);
    }
  }

  console.log(
    new Date(),
    '[ENS EXISTING]',
    `[FOUND ${deltaEns.length} DELTA ENS]`
  );

  return deltaEns;
}

async function findNewEns(wallets: string[]) {
  console.log(
    new Date(),
    '[ENS NEW]',
    `[PROCESSING NEW ENS FOR ${wallets.length} WALLETS]`
  );

  const finalEns: ENS[] = [];

  await Promise.all(
    wallets.map(async (w) => {
      try {
        const display = await alchemy.core.lookupAddress(w);
        let displayStr = display;
        if (display) {
          displayStr = replaceEmojisWithHex(display);
        }
        const newEns: ENS = {
          created_at: new Date(),
          wallet: w,
          display: displayStr
        };
        finalEns.push(newEns);
      } catch (e: any) {
        console.log('[ENS NEW]', `[ERROR FOR WALLET ${w}]`, e.message);
        const newEns: ENS = {
          created_at: new Date(),
          wallet: w,
          display: null
        };
        finalEns.push(newEns);
      }
    })
  );

  console.log(new Date(), '[ENS NEW]', `[FOUND ${finalEns.length} NEW ENS]`);

  return finalEns;
}

export async function discoverEns(datetime?: Date) {
  alchemy = new Alchemy({
    ...ALCHEMY_SETTINGS,
    apiKey: process.env.ALCHEMY_API_KEY
  });

  try {
    const missingEns = await fetchMissingEns(datetime);
    if (missingEns.length > 0) {
      const newEns = await findNewEns(missingEns);
      if (newEns.length > 0) {
        await persistENS(newEns);
        await discoverEns(datetime);
      }
    }
  } catch (e: any) {
    console.log(e);
    await discoverEns(datetime);
  }
}

export async function discoverEnsDelegations() {
  alchemy = new Alchemy({
    ...ALCHEMY_SETTINGS,
    apiKey: process.env.ALCHEMY_API_KEY
  });

  try {
    const missingEns = await fetchMissingEnsDelegations();
    if (missingEns.length > 0) {
      const newEns = await findNewEns(missingEns);
      if (newEns.length > 0) {
        await persistENS(newEns);
        await discoverEnsDelegations();
      }
    }
  } catch (e: any) {
    console.log(e);
    await discoverEnsDelegations();
  }
}

async function refreshEnsLoop() {
  let batch: ENS[];
  if (process.env.REFRESH_BROKEN_ENS === 'true') {
    console.log(`[REFRESH ENS LOOP] [REFRESHING BROKEN ENS]`);
    batch = await fetchBrokenEnsRefresh();
  } else {
    batch = await fetchEnsRefresh();
  }

  if (batch.length > 0) {
    const delta = await findExistingEns(batch);
    await persistENS(delta);
    return true;
  } else {
    return false;
  }
}

export async function refreshEns() {
  alchemy = new Alchemy({
    ...ALCHEMY_SETTINGS,
    apiKey: process.env.ALCHEMY_API_KEY
  });

  let processing = true;
  while (processing) {
    processing = await refreshEnsLoop();
  }
}

function replaceEmojisWithHex(inputString: string) {
  return inputString.replace(/[\u{1F300}-\u{1F6FF}]/gu, (match: string) => {
    const codePoint = match.codePointAt(0);
    if (codePoint) {
      const emojiHex = codePoint.toString(16).toUpperCase();
      return `U+${emojiHex}`;
    }
    return match;
  });
}
