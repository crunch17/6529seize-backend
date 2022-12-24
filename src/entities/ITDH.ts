export interface TDH {
  date: Date;
  wallet: string;
  block: number;
  tdh: number;
  boost: number;
  boosted_tdh: number;
  tdh__raw: number;
  tdh_rank: number;
  balance: number;
  genesis: boolean;
  memes_cards_sets: number;
  unique_memes: number;
  memes_tdh: number;
  memes_tdh__raw: number;
  memes_balance: number;
  memes_tdh_season1: number;
  memes_balance_season1: number;
  memes_tdh_season1__raw: number;
  memes_tdh_season2: number;
  memes_balance_season2: number;
  memes_tdh_season2__raw: number;
  memes: any;
  memes_ranks: any;
  gradients_balance: number;
  gradients_tdh: number;
  gradients_tdh__raw: number;
  gradients: any;
  gradients_ranks: any;
}

export interface TDHENS extends TDH {
  ens: string;
}
