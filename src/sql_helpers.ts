import {
  MEMES_CONTRACT,
  SZN1_INDEX,
  SZN2_INDEX,
  SZN3_INDEX,
  SZN4_INDEX,
  GRADIENT_CONTRACT,
  CONSOLIDATIONS_TABLE
} from './constants';

const mysql = require('mysql');

export function getConsolidationsSql(wallet: string) {
  const sql = `SELECT * FROM ${CONSOLIDATIONS_TABLE} 
    WHERE 
      (wallet1 = ${mysql.escape(wallet)} OR wallet2 = ${mysql.escape(wallet)}
      OR wallet1 IN (SELECT wallet2 FROM consolidations WHERE wallet1 = ${mysql.escape(
        wallet
      )} AND confirmed = true)
      OR wallet2 IN (SELECT wallet1 FROM consolidations WHERE wallet2 = ${mysql.escape(
        wallet
      )} AND confirmed = true)
      OR wallet2 IN (SELECT wallet2 FROM consolidations WHERE wallet1 = ${mysql.escape(
        wallet
      )} AND confirmed = true)
      OR wallet1 IN (SELECT wallet1 FROM consolidations WHERE wallet2 = ${mysql.escape(
        wallet
      )} AND confirmed = true)
      )
      AND confirmed = true
    ORDER BY block DESC`;
  return sql;
}

export function getProfilePageSql(resolvedWallets: string[]) {
  return `SELECT 
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0) AS transfers_out,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0) AS transfers_in,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0) AS purchases_count,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0) AS purchases_value,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0) AS sales_count,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0) AS sales_value,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS sales_count_memes,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS sales_value_memes,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS transfers_out_memes,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS purchases_count_memes,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS purchases_value_memes,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )}) AS transfers_in_memes,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS sales_count_memes_season1,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS sales_value_memes_season1,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS transfers_out_memes_season1,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS purchases_count_memes_season1,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS purchases_value_memes_season1,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id <= ${SZN1_INDEX.end}) AS transfers_in_memes_season1,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS sales_count_memes_season2,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS sales_value_memes_season2,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS transfers_out_memes_season2,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS purchases_count_memes_season2,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS purchases_value_memes_season2,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN1_INDEX.end} AND token_id <= ${
    SZN2_INDEX.end
  }) AS transfers_in_memes_season2,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS sales_count_memes_season3,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS sales_value_memes_season3,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS transfers_out_memes_season3,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS purchases_count_memes_season3,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS purchases_value_memes_season3,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN2_INDEX.end} AND token_id <= ${
    SZN3_INDEX.end
  }) AS transfers_in_memes_season3,
      (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS sales_count_memes_season4,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS sales_value_memes_season4,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS transfers_out_memes_season4,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS purchases_count_memes_season4,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS purchases_value_memes_season4,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN3_INDEX.end} AND token_id <= ${
    SZN4_INDEX.end
  }) AS transfers_in_memes_season4,
      (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS sales_count_memes_season5,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS sales_value_memes_season5,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS transfers_out_memes_season5,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS purchases_count_memes_season5,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS purchases_value_memes_season5,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    MEMES_CONTRACT
  )} AND token_id > ${SZN4_INDEX.end}) AS transfers_in_memes_season5,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS sales_count_gradients,
    (SELECT SUM(value) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS sales_value_gradients,
    (SELECT SUM(token_count) FROM transactions 
     WHERE from_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS transfers_out_gradients,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS purchases_count_gradients,
    (SELECT SUM(value) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value > 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS purchases_value_gradients,
    (SELECT SUM(token_count) FROM transactions 
     WHERE to_address IN (${mysql.escape(
       resolvedWallets
     )}) AND value = 0 AND contract=${mysql.escape(
    GRADIENT_CONTRACT
  )}) AS transfers_in_gradients`;
}