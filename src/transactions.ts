import {
  Alchemy,
  AssetTransfersCategory,
  AssetTransfersWithMetadataParams,
  fromHex,
  toHex
} from 'alchemy-sdk';
import {
  ALCHEMY_SETTINGS,
  GRADIENT_CONTRACT,
  MEMES_CONTRACT
} from './constants';
import { BaseTransaction } from './entities/ITransaction';
import { Logger } from './logging';

const logger = Logger.get('TRANSACTIONS');

let alchemy: Alchemy;

async function getAllTransactions(
  startingBlock: number,
  latestBlock: number,
  key: any,
  contracts?: string[]
) {
  const startingBlockHex = `0x${startingBlock.toString(16)}`;
  const latestBlockHex = `0x${latestBlock.toString(16)}`;

  logger.info(
    `[FROM BLOCK ${startingBlockHex}] [TO BLOCK ${latestBlockHex}] [PAGE KEY ${key}]`
  );

  const settings: AssetTransfersWithMetadataParams = {
    category: [AssetTransfersCategory.ERC1155, AssetTransfersCategory.ERC721],
    contractAddresses: contracts
      ? contracts
      : [MEMES_CONTRACT, GRADIENT_CONTRACT],
    withMetadata: true,
    maxCount: 150,
    fromBlock: startingBlockHex,
    toBlock: latestBlockHex,
    pageKey: key ? key : undefined
  };

  const response = await alchemy.core.getAssetTransfers(settings);
  return response;
}

export const findTransactions = async (
  startingBlock: number,
  latestBlock?: number,
  pageKey?: string,
  contracts?: string[]
) => {
  alchemy = new Alchemy({
    ...ALCHEMY_SETTINGS,
    apiKey: process.env.ALCHEMY_API_KEY
  });

  if (!latestBlock) {
    latestBlock = await alchemy.core.getBlockNumber();
    logger.info(
      `[STARTING BLOCK ${startingBlock}] [LATEST BLOCK ON CHAIN ${latestBlock}]`
    );
  }

  const timestamp = (await alchemy.core.getBlock(latestBlock)).timestamp;

  const transactions = await getAllTransactions(
    startingBlock,
    latestBlock,
    pageKey,
    contracts
  );

  logger.info(`[FOUND ${transactions.transfers.length} NEW TRANSACTIONS]`);

  if (transactions.transfers.length == 0) {
    return {
      latestBlock: latestBlock,
      latestBlockTimestamp: new Date(timestamp * 1000),
      transactions: []
    };
  }

  const finalTransactions: BaseTransaction[] = [];

  await Promise.all(
    transactions.transfers.map(async (t) => {
      if (t.erc721TokenId) {
        const tokenId = parseInt(t.erc721TokenId, 16);
        const tokenCount = 1;
        if (t.to && t.rawContract.address) {
          const finalTransaction: BaseTransaction = {
            created_at: new Date(),
            transaction: t.hash,
            block: fromHex(t.blockNum),
            transaction_date: new Date(t.metadata.blockTimestamp),
            from_address: t.from,
            to_address: t.to,
            contract: t.rawContract.address,
            token_id: tokenId,
            token_count: tokenCount,
            value: 0,
            royalties: 0,
            gas_gwei: 0,
            gas_price: 0,
            gas_price_gwei: 0,
            gas: 0
          };
          finalTransactions.push(finalTransaction);
        }
      } else if (t.erc1155Metadata) {
        t.erc1155Metadata.map((md) => {
          const tokenId = parseInt(md.tokenId, 16);
          const tokenCount = parseInt(md.value, 16);
          if (t.to && t.rawContract.address) {
            const finalTransaction: BaseTransaction = {
              created_at: new Date(),
              transaction: t.hash,
              block: fromHex(t.blockNum),
              transaction_date: new Date(t.metadata.blockTimestamp),
              from_address: t.from,
              to_address: t.to,
              contract: t.rawContract.address,
              token_id: tokenId,
              token_count: tokenCount,
              value: 0,
              royalties: 0,
              gas_gwei: 0,
              gas_price: 0,
              gas_price_gwei: 0,
              gas: 0
            };
            finalTransactions.push(finalTransaction);
          }
        });
      }
    })
  );

  logger.info(`[PROCESSED ${finalTransactions.length} TRANSACTIONS]`);

  return {
    latestBlock: latestBlock,
    latestBlockTimestamp: new Date(timestamp * 1000),
    transactions: finalTransactions,
    pageKey: transactions.pageKey
  };
};
