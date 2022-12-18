import {
  ARTISTS_TABLE,
  ENS_TABLE,
  GRADIENT_CONTRACT,
  MEMES_CONTRACT,
  MEMES_EXTENDED_DATA_TABLE,
  NFTS_TABLE,
  OWNERS_TABLE,
  OWNERS_TAGS_TABLE,
  TDH_BLOCKS_TABLE,
  TRANSACTIONS_TABLE,
  WALLETS_TDH_TABLE
} from './constants';
import * as db from './db';
import { areEqualAddresses } from './helpers';

const mysql = require('mysql');

export interface DBResponse {
  count: number;
  page: number;
  next: any;
  data: any[];
}

async function fetchPaginated(
  table: string,
  orderBy: string,
  pageSize: number,
  page: number,
  filters: string,
  fields?: string,
  joins?: string
) {
  const sql1 = `SELECT COUNT(*) as count FROM ${table} ${joins} ${filters}`;
  let sql2 = `SELECT ${
    fields ? fields : '*'
  } FROM ${table} ${joins} ${filters} order by ${orderBy} LIMIT ${pageSize}`;
  if (page > 1) {
    const offset = pageSize * (page - 1);
    sql2 += ` OFFSET ${offset}`;
  }
  const r1 = await db.execSQL(sql1);
  const r2 = await db.execSQL(sql2);

  // console.log(sql1);
  // console.log(sql2);

  return {
    count: r1[0]?.count,
    page: page,
    next: r1[0]?.count > pageSize * page,
    data: r2
  };
}

export async function fetchBlocks(pageSize: number, page: number) {
  return fetchPaginated(
    TDH_BLOCKS_TABLE,
    'block_number desc',
    pageSize,
    page,
    '',
    ''
  );
}

export async function fetchArtists(
  pageSize: number,
  page: number,
  meme_nfts: string
) {
  let filters = '';
  if (meme_nfts) {
    filters = `WHERE `;
    meme_nfts.split(',').map((nft_id) => {
      const query = `%\"id\": ${nft_id}%`;
      filters += ` memes LIKE ${mysql.escape(query)}`;
    });
  }
  return fetchPaginated(
    ARTISTS_TABLE,
    'created_at desc',
    pageSize,
    page,
    filters
  );
}

export async function fetchNFTs(
  pageSize: number,
  page: number,
  contracts: string,
  nfts: string,
  sortDir: string
) {
  let filters = '';
  if (contracts) {
    filters = `WHERE contract in (${mysql.escape(contracts.split(','))})`;
  }
  if (nfts) {
    if (contracts) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` id in (${nfts})`;
  }
  return fetchPaginated(
    NFTS_TABLE,
    `id ${sortDir}`,
    pageSize,
    page,
    filters,
    '',
    ''
  );
}

export async function fetchNFTsForWallet(
  address: string,
  pageSize: number,
  page: number
) {
  const fields = ` ${NFTS_TABLE}.* `;
  const joins = `INNER JOIN owners ON nfts.id = owners.token_id AND nfts.contract = owners.contract`;
  const filters = `WHERE owners.wallet = ${mysql.escape(address)}`;

  return fetchPaginated(
    NFTS_TABLE,
    'nfts.contract asc, nfts.id asc',
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchMemesExtended(
  pageSize: number,
  page: number,
  nfts: string,
  seasons: string
) {
  let filters = '';

  if (nfts) {
    filters += ` WHERE id in (${nfts})`;
  }
  if (seasons) {
    if (nfts) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` season in (${seasons})`;
  }
  return fetchPaginated(
    MEMES_EXTENDED_DATA_TABLE,
    'id',
    pageSize,
    page,
    filters
  );
}

export async function fetchOwners(
  pageSize: number,
  page: number,
  wallets: string,
  contracts: string,
  nfts: string
) {
  let filters = '';
  if (wallets) {
    filters = `WHERE (${OWNERS_TABLE}.wallet in (${mysql.escape(
      wallets.split(',')
    )}) OR ${ENS_TABLE}.display in (${mysql.escape(wallets.split(','))}))`;
  }
  if (contracts) {
    if (wallets) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` contract in (${mysql.escape(contracts.split(','))})`;
  }
  if (nfts) {
    if (contracts || wallets) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` token_id in (${nfts})`;
  }

  const fields = ` ${OWNERS_TABLE}.*,${ENS_TABLE}.display as wallet_display `;
  const joins = `LEFT JOIN ${ENS_TABLE} ON ${OWNERS_TABLE}.wallet=${ENS_TABLE}.wallet`;

  return fetchPaginated(
    OWNERS_TABLE,
    'token_id asc, created_at desc',
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchOwnersTags(
  pageSize: number,
  page: number,
  wallets: string
) {
  let filters = '';
  if (wallets) {
    filters = `WHERE ${OWNERS_TAGS_TABLE}.wallet in (${mysql.escape(
      wallets.split(',')
    )}) OR ${ENS_TABLE}.display in (${mysql.escape(wallets.split(','))})`;
  }

  const fields = ` ${OWNERS_TAGS_TABLE}.*,${ENS_TABLE}.display as wallet_display `;
  const joins = `LEFT JOIN ${ENS_TABLE} ON ${OWNERS_TAGS_TABLE}.wallet=${ENS_TABLE}.wallet`;

  return fetchPaginated(
    OWNERS_TAGS_TABLE,
    'memes_balance desc, gradients_balance desc',
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchTransactions(
  pageSize: number,
  page: number,
  wallets: string,
  contracts: string,
  nfts: string
) {
  let filters = '';
  if (wallets) {
    filters = `WHERE (from_address in (${mysql.escape(
      wallets.split(',')
    )}) OR to_address in (${mysql.escape(wallets.split(','))}))`;
  }
  if (contracts) {
    if (wallets) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` contract in (${mysql.escape(contracts.split(','))})`;
  }
  if (nfts) {
    if (contracts || wallets) {
      filters += ' AND';
    } else {
      filters += ' WHERE';
    }
    filters += ` token_id in (${nfts})`;
  }

  const fields = `${TRANSACTIONS_TABLE}.*,ens1.display as from_display, ens2.display as to_display`;
  const joins = `LEFT JOIN ${ENS_TABLE} ens1 ON ${TRANSACTIONS_TABLE}.from_address=ens1.wallet LEFT JOIN ${ENS_TABLE} ens2 ON ${TRANSACTIONS_TABLE}.to_address=ens2.wallet`;

  return fetchPaginated(
    TRANSACTIONS_TABLE,
    'transaction_date desc',
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchGradientTdh(pageSize: number, page: number) {
  const tdhBlock = await db.fetchLatestTDHBlockNumber();
  let filters = `WHERE block=${tdhBlock} `;
  filters += ` AND gradients_balance > 0`;

  const fields = ` ${WALLETS_TDH_TABLE}.*,${ENS_TABLE}.display as wallet_display `;
  const joins = `LEFT JOIN ${ENS_TABLE} ON ${WALLETS_TDH_TABLE}.wallet=${ENS_TABLE}.wallet`;

  return fetchPaginated(
    WALLETS_TDH_TABLE,
    `tdh DESC`,
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchNftTdh(
  pageSize: number,
  page: number,
  contract: string,
  nftId: number
) {
  const tdhBlock = await db.fetchLatestTDHBlockNumber();
  let filters = `WHERE block=${tdhBlock} AND j.id=${nftId}`;
  let joins;

  if (areEqualAddresses(contract, MEMES_CONTRACT)) {
    joins = `LEFT JOIN ${ENS_TABLE} ON ${WALLETS_TDH_TABLE}.wallet=${ENS_TABLE}.wallet CROSS JOIN JSON_TABLE(memes, '$[*]' COLUMNS ( 
        id INT PATH '$.id', 
        tdh DOUBLE PATH '$.tdh'
      )
    ) AS j`;
  } else if (areEqualAddresses(contract, GRADIENT_CONTRACT)) {
    joins = `LEFT JOIN ${ENS_TABLE} ON ${WALLETS_TDH_TABLE}.wallet=${ENS_TABLE}.wallet CROSS JOIN JSON_TABLE(gradients, '$[*]' COLUMNS ( 
        id varchar(100) PATH '$.id', 
        tdh varchar(100) PATH '$.tdh'
      )
    ) AS j`;
  } else {
    return returnEmpty();
  }

  const fields = ` ${WALLETS_TDH_TABLE}.*,${ENS_TABLE}.display as wallet_display `;

  return fetchPaginated(
    WALLETS_TDH_TABLE,
    `j.tdh DESC`,
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

export async function fetchTDH(
  pageSize: number,
  page: number,
  wallets: string,
  sort: string,
  sortDir: string
) {
  const tdhBlock = await db.fetchLatestTDHBlockNumber();
  let filters = `WHERE block=${tdhBlock}`;
  if (wallets) {
    filters += `  and ${WALLETS_TDH_TABLE}.wallet in (${mysql.escape(
      wallets.split(',')
    )})`;
  }

  const fields = ` ${WALLETS_TDH_TABLE}.*,${ENS_TABLE}.display as wallet_display `;
  const joins = `LEFT JOIN ${ENS_TABLE} ON ${WALLETS_TDH_TABLE}.wallet=${ENS_TABLE}.wallet`;

  return fetchPaginated(
    WALLETS_TDH_TABLE,
    `${sort} ${sortDir}, boosted_tdh ${sortDir}`,
    pageSize,
    page,
    filters,
    fields,
    joins
  );
}

function returnEmpty() {
  return {
    count: 0,
    page: 0,
    next: null,
    data: []
  };
}

export async function fetchEns(address: string) {
  const sql = `SELECT * FROM ${ENS_TABLE} WHERE wallet=${mysql.escape(
    address
  )}`;
  return db.execSQL(sql);
}
