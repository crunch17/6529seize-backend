import { Utils } from 'alchemy-sdk';
import fetch from 'node-fetch';
import { NFT } from './entities/INFT';
import { delay } from './helpers';
import { persistNftMarketStats, fetchNftsForContract } from './db';

async function getResult(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY!,
        accept: 'application/json'
      }
    });
    return response;
  } catch (err: any) {
    return null;
  }
}

const findFloorPrice = async (stat: any): Promise<number> => {
  const url = `https://api.opensea.io/v2/orders/ethereum/seaport/listings?asset_contract_address=${stat.contract}&limit=1&token_ids=${stat.id}&order_by=eth_price&order_direction=asc`;

  const res = await getResult(url);

  if (res && res.status === 200) {
    const response: any = await res.json();
    let floorPrice = 0;
    if (response.orders && response.orders.length > 0) {
      floorPrice = response.orders[0].current_price;
    }
    return parseFloat(Utils.formatEther(floorPrice));
  } else {
    // console.log(
    //   new Date(),
    //   '[NFT MARKET STATS]',
    //   `[THROTTLED!]`,
    //   `[CONTRACT ${stat.contract}]`,
    //   `[ID ${stat.id}]`,
    //   '[RETRYING IN 2500ms]'
    // );
    await delay(500);
    return await findFloorPrice(stat);
  }
};

export const findNftMarketStats = async (contract: string) => {
  const nfts: NFT[] = await fetchNftsForContract(contract, 'id desc');

  console.log(
    new Date(),
    '[NFT MARKET STATS]',
    `[CONTRACT ${contract}]`,
    `[PROCESSING STATS FOR ${nfts.length} NFTS]`
  );

  const processedStats: any[] = [];

  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const floorPrice = await findFloorPrice(nft);
    nft.floor_price = floorPrice;
    nft.market_cap = floorPrice * nft.supply;
    await persistNftMarketStats([nft]);
    console.log(
      new Date(),
      '[NFT MARKET STATS]',
      `[CONTRACT ${contract}]`,
      `[PROCESSED FOR ID ${nft.id}]`
    );
  }

  console.log(
    new Date(),
    '[NFT MARKET STATS]',
    `[PROCESSED ASSETS FOR ${processedStats.length} NFTS]`
  );
  return processedStats;
};
