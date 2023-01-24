import {
  ARTISTS_TABLE,
  ENS_TABLE,
  GRADIENT_CONTRACT,
  MEMES_CONTRACT,
  MEMES_EXTENDED_DATA_TABLE,
  NFTS_TABLE,
  NULL_ADDRESS,
  OWNERS_METRICS_TABLE,
  OWNERS_TABLE,
  OWNERS_TAGS_TABLE,
  SIX529_MUSEUM,
  TDH_BLOCKS_TABLE,
  TRANSACTIONS_TABLE,
  UPLOADS_TABLE,
  WALLETS_TDH_TABLE
} from './constants';
import { areEqualAddresses } from './helpers';

const config = require('./config');
const mysql = require('mysql');

console.log(new Date(), '[DATABASE API]', `[DB HOST ${config.db_api.DB_HOST}]`);

export const dbcon = mysql.createConnection({
  host: config.db_api.DB_HOST,
  port: config.db_api.port,
  user: config.db_api.DB_USER,
  password: config.db_api.DB_PASS,
  charset: 'utf8mb4'
});

function connect() {
  dbcon.connect((err: any) => {
    if (err) throw err;
    console.log(new Date(), '[DATABASE]', `DATABASE CONNECTION SUCCESS`);
  });
}

dbcon.on('error', function (err: any) {
  console.error(
    new Date(),
    '[DATABASE]',
    `[DISCONNECTED][ERROR CODE ${err.code}]`
  );
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    connect();
  } else {
    throw err;
  }
});

dbcon.query(`USE ${config.db.DB_NAME}`, (err: any) => {
  if (err) throw err;
  console.log(
    new Date(),
    '[DATABASE]',
    `[DATABASE SELECTED ${config.db.DB_NAME}]`
  );
});

export function execSQL(sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    dbcon.query(sql, (err: any, result: any[]) => {
      if (err) return reject(err);
      resolve(Object.values(JSON.parse(JSON.stringify(result))));
    });
  });
}

export async function fetchLatestTDHBlockNumber() {
  let sql = `SELECT block_number FROM ${TDH_BLOCKS_TABLE} order by block_number desc limit 1;`;
  const r = await execSQL(sql);
  return r.length > 0 ? r[0].block_number : 0;
}

export interface DBResponse {
  count: number;
  page: number;
  next: any;
  data: any[];
}

function constructFilters(f: string, newF: string) {
  if (f.trim().toUpperCase().startsWith('WHERE')) {
    return ` ${f} AND ${newF} `;
  }
  return ` WHERE ${newF} `;
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
  const r1 = await execSQL(sql1);
  const r2 = await execSQL(sql2);

  // console.log(sql1);
  // console.log(sql2);

  return {
    count: r1[0]?.count,
    page: page,
    next: r1[0]?.count > pageSize * page,
    data: r2
  };
}

export async function fetchRandomImage() {
  const sql = `SELECT image from ${NFTS_TABLE} WHERE CONTRACT=${mysql.escape(
    MEMES_CONTRACT
  )} ORDER BY RAND() LIMIT 1;`;
  return execSQL(sql);
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

export async function fetchUploads(pageSize: number, page: number) {
  return fetchPaginated(UPLOADS_TABLE, 'block desc', pageSize, page, '', '');
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
    filters = constructFilters(
      filters,
      `contract in (${mysql.escape(contracts.split(','))})`
    );
  }
  if (nfts) {
    filters = constructFilters(filters, `id in (${nfts})`);
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
    filters = constructFilters(filters, `id in (${nfts})`);
  }
  if (seasons) {
    filters = constructFilters(filters, `season in (${seasons})`);
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
    filters = constructFilters(
      filters,
      `(${OWNERS_TABLE}.wallet in (${mysql.escape(
        wallets.split(',')
      )}) OR ${ENS_TABLE}.display in (${mysql.escape(wallets.split(','))}))`
    );
  }
  if (contracts) {
    filters = constructFilters(
      filters,
      `contract in (${mysql.escape(contracts.split(','))})`
    );
  }
  if (nfts) {
    filters = constructFilters(filters, `token_id in (${nfts})`);
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
    filters = constructFilters(
      filters,
      `${OWNERS_TAGS_TABLE}.wallet in (${mysql.escape(
        wallets.split(',')
      )}) OR ${ENS_TABLE}.display in (${mysql.escape(wallets.split(','))})`
    );
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
  nfts: string,
  type_filter: string
) {
  let filters = '';
  if (wallets) {
    filters = constructFilters(
      filters,
      `(from_address in (${mysql.escape(
        wallets.split(',')
      )}) OR to_address in (${mysql.escape(wallets.split(','))}))`
    );
  }
  if (contracts) {
    filters = constructFilters(
      filters,
      `contract in (${mysql.escape(contracts.split(','))})`
    );
  }
  if (nfts) {
    filters = constructFilters(filters, `token_id in (${nfts})`);
  }
  if (type_filter) {
    let newTypeFilter = '';
    switch (type_filter) {
      case 'sales':
        newTypeFilter += 'value > 0';
        break;
      case 'airdrops':
        newTypeFilter += `from_address = ${mysql.escape(NULL_ADDRESS)}`;
        break;
      case 'transfers':
        newTypeFilter += `value = 0 and from_address != ${mysql.escape(
          NULL_ADDRESS
        )}`;
        break;
    }
    if (newTypeFilter) {
      filters = constructFilters(filters, newTypeFilter);
    }
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
  const tdhBlock = await fetchLatestTDHBlockNumber();
  let filters = constructFilters('', `block=${tdhBlock}`);
  filters = constructFilters(filters, `gradients_balance > 0`);

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
  nftId: number,
  wallets: string
) {
  const tdhBlock = await fetchLatestTDHBlockNumber();
  let filters = `WHERE block=${tdhBlock} AND j.id=${nftId} `;
  if (wallets) {
    filters += ` AND ${WALLETS_TDH_TABLE}.wallet in (${mysql.escape(
      wallets.split(',')
    )})`;
  }

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

  joins += ` JOIN (SELECT wallet, DENSE_RANK() OVER(ORDER BY ${OWNERS_TABLE}.balance DESC) AS dense_rank_balance from ${OWNERS_TABLE} where ${OWNERS_TABLE}.contract=${mysql.escape(
    contract
  )} and ${OWNERS_TABLE}.token_id=${nftId}) as dense_table ON ${WALLETS_TDH_TABLE}.wallet = dense_table.wallet`;

  const fields = ` ${WALLETS_TDH_TABLE}.*,${ENS_TABLE}.display as wallet_display, dense_table.dense_rank_balance `;

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
  sortDir: string,
  tdh_filter: string,
  hideMuseum: boolean
) {
  const tdhBlock = await fetchLatestTDHBlockNumber();
  let filters = `WHERE block=${tdhBlock}`;
  if (hideMuseum) {
    filters = constructFilters(
      filters,
      `${WALLETS_TDH_TABLE}.wallet != ${mysql.escape(SIX529_MUSEUM)}`
    );
  }
  if (wallets) {
    filters = constructFilters(
      filters,
      `${WALLETS_TDH_TABLE}.wallet in (${mysql.escape(wallets.split(','))})`
    );
  }
  if (tdh_filter) {
    switch (tdh_filter) {
      case 'memes_set':
        filters = constructFilters(
          filters,
          `${WALLETS_TDH_TABLE}.memes_cards_sets > 0`
        );
        break;
      case 'memes_genesis':
        filters = constructFilters(filters, `${WALLETS_TDH_TABLE}.genesis > 0`);
        break;
      case 'gradients':
        filters = constructFilters(
          filters,
          `${WALLETS_TDH_TABLE}.gradients_balance > 0`
        );
        break;
    }
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

export async function fetchOwnerMetrics(
  pageSize: number,
  page: number,
  wallets: string,
  sort: string,
  sortDir: string,
  metrics_filter: string,
  hideMuseum: boolean
) {
  const tdhBlock = await fetchLatestTDHBlockNumber();
  let filters = '';
  if (hideMuseum) {
    filters = constructFilters(
      filters,
      `${OWNERS_METRICS_TABLE}.wallet != ${mysql.escape(SIX529_MUSEUM)}`
    );
  }
  if (wallets) {
    filters = constructFilters(
      filters,
      `${OWNERS_METRICS_TABLE}.wallet in (${mysql.escape(wallets.split(','))})`
    );
  }
  if (metrics_filter) {
    switch (metrics_filter) {
      case 'memes':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.memes_balance > 0`
        );
        break;
      case 'memes_set':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.memes_cards_sets > 0`
        );
        break;
      case 'memes_genesis':
        filters = constructFilters(filters, `${OWNERS_TAGS_TABLE}.genesis > 0`);
        break;
      case 'gradients':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.gradients_balance > 0`
        );
        break;
      case 'memes_set_minus1':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.memes_cards_sets_minus1 > 0`
        );
        break;
      case 'memes_set_szn1':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.memes_cards_sets_szn1 > 0`
        );
        break;
      case 'memes_set_szn2':
        filters = constructFilters(
          filters,
          `${OWNERS_TAGS_TABLE}.memes_cards_sets_szn2 > 0`
        );
        break;
    }
  }

  let ownerMetricsSelect;

  if (!wallets) {
    ownerMetricsSelect = ` ${OWNERS_METRICS_TABLE}.*, 
    DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.balance DESC) AS dense_rank_balance, 
    DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance DESC) AS dense_rank_balance_memes, 
    DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance_season1 DESC) AS dense_rank_balance_memes_season1, 
    DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance_season2 DESC) AS dense_rank_balance_memes_season2,
    DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.gradients_balance DESC) AS dense_rank_balance_gradients`;
  } else {
    ownerMetricsSelect = ` ${OWNERS_METRICS_TABLE}.*, 
    dense_table.dense_rank_balance, 
    dense_table.dense_rank_balance_memes, 
    dense_table.dense_rank_balance_memes_season1, 
    dense_table.dense_rank_balance_memes_season2,
    dense_table.dense_rank_balance_gradients`;
  }

  const walletsTdhTableSelect = `
    ${WALLETS_TDH_TABLE}.tdh_rank, 
    ${WALLETS_TDH_TABLE}.tdh_rank_memes, 
    ${WALLETS_TDH_TABLE}.tdh_rank_memes_szn1, 
    ${WALLETS_TDH_TABLE}.tdh_rank_memes_szn2, 
    ${WALLETS_TDH_TABLE}.tdh_rank_gradients, 
    ${WALLETS_TDH_TABLE}.boosted_tdh, 
    ${WALLETS_TDH_TABLE}.boosted_memes_tdh, 
    ${WALLETS_TDH_TABLE}.boosted_memes_tdh_season1, 
    ${WALLETS_TDH_TABLE}.boosted_memes_tdh_season2, 
    ${WALLETS_TDH_TABLE}.boosted_gradients_tdh, 
    ${WALLETS_TDH_TABLE}.memes,
    ${WALLETS_TDH_TABLE}.memes_ranks, 
    ${WALLETS_TDH_TABLE}.gradients, 
    ${WALLETS_TDH_TABLE}.gradients_ranks`;

  const fields = ` ${ownerMetricsSelect},${ENS_TABLE}.display as wallet_display, ${walletsTdhTableSelect} , ${OWNERS_TAGS_TABLE}.* `;
  let joins = ` LEFT JOIN ${WALLETS_TDH_TABLE} ON ${WALLETS_TDH_TABLE}.wallet=${OWNERS_METRICS_TABLE}.wallet and ${WALLETS_TDH_TABLE}.block=${tdhBlock}`;
  joins += ` LEFT JOIN ${OWNERS_TAGS_TABLE} ON ${OWNERS_METRICS_TABLE}.wallet=${OWNERS_TAGS_TABLE}.wallet `;
  joins += ` LEFT JOIN ${ENS_TABLE} ON ${OWNERS_METRICS_TABLE}.wallet=${ENS_TABLE}.wallet `;

  if (wallets) {
    joins += ` JOIN (SELECT wallet, DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.balance DESC) AS dense_rank_balance, DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance DESC) AS dense_rank_balance_memes, DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance_season1 DESC) AS dense_rank_balance_memes_season1, DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.memes_balance_season2 DESC) AS dense_rank_balance_memes_season2,DENSE_RANK() OVER(ORDER BY ${OWNERS_METRICS_TABLE}.gradients_balance DESC) AS dense_rank_balance_gradients FROM ${OWNERS_METRICS_TABLE}) as dense_table ON ${OWNERS_METRICS_TABLE}.wallet = dense_table.wallet `;
  }

  if (
    sort == 'balance' ||
    sort == 'memes_balance' ||
    sort == 'memes_balance_season1' ||
    sort == 'memes_balance_season2' ||
    sort == 'gradients_balance'
  ) {
    sort = `${OWNERS_METRICS_TABLE}.${sort}`;
  }
  if (
    sort == 'memes_cards_sets' ||
    sort == 'memes_cards_sets_szn1' ||
    sort == 'memes_cards_sets_szn2' ||
    sort == 'memes_cards_sets_minus1' ||
    sort == 'genesis' ||
    sort == 'unique_memes' ||
    sort == 'unique_memes_szn1' ||
    sort == 'unique_memes_szn2'
  ) {
    sort = `${OWNERS_TAGS_TABLE}.${sort}`;
  }

  return fetchPaginated(
    OWNERS_METRICS_TABLE,
    `${sort} ${sortDir}, ${OWNERS_METRICS_TABLE}.balance ${sortDir}, boosted_tdh ${sortDir}`,
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
  return execSQL(sql);
}

export async function fetchRanksForWallet(address: string) {
  const tdhBlock = await fetchLatestTDHBlockNumber();
  const sqlTags = `SELECT * FROM ${OWNERS_TAGS_TABLE} WHERE wallet=${mysql.escape(
    address
  )}`;
  const sqlTdh = `SELECT * FROM ${WALLETS_TDH_TABLE} WHERE block=${tdhBlock} and wallet=${mysql.escape(
    address
  )}`;
  const ownerTags = await execSQL(sqlTags);
  const ownerTdh = await execSQL(sqlTdh);

  return ownerTdh;
}