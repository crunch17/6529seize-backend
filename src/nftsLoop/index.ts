import { nfts } from '../nfts';
import { findOwners } from '../owners';
import { findOwnerTags } from '../owners_tags';
import { findMemesExtendedData } from '../memes_extended_data';
import { loadEnv } from '../secrets';

export const handler = async (event?: any, context?: any) => {
  console.log(new Date(), '[RUNNING NFTS LOOP]');
  await loadEnv();
  await nftsLoop();
  console.log(new Date(), '[NFTS LOOP COMPLETE]');
};

async function nftsLoop() {
  await nfts();
  await findOwners();
  await findMemesExtendedData();
  await findOwnerTags();
}