import { Network } from 'alchemy-sdk';

export const TDH_BLOCKS_TABLE = 'tdh_blocks';
export const TRANSACTIONS_TABLE = 'transactions';
export const TRANSACTIONS_MEME_LAB_TABLE = 'transactions_meme_lab';
export const TRANSACTIONS_REMAKE_TABLE = 'transactions_remake';
export const NFTS_TABLE = 'nfts';
export const NFTS_MEME_LAB_TABLE = 'nfts_meme_lab';
export const MEME_LAB_ROYALTIES_TABLE = 'meme_lab_royalties';
export const ARTISTS_TABLE = 'artists';
export const OWNERS_TABLE = 'owners';
export const OWNERS_MEME_LAB_TABLE = 'owners_meme_lab';
export const OWNERS_TAGS_TABLE = 'owners_tags';
export const OWNERS_METRICS_TABLE = 'owners_metrics';
export const MEMES_EXTENDED_DATA_TABLE = 'memes_extended_data';
export const LAB_EXTENDED_DATA_TABLE = 'lab_extended_data';
export const WALLETS_TDH_TABLE = 'tdh';
export const UPLOADS_TABLE = 'uploads';
export const CONSOLIDATED_UPLOADS_TABLE = 'uploads_consolidation';
export const ENS_TABLE = 'ens';
export const ABUSIVENESS_DETECTION_RESULTS_TABLE =
  'abusiveness_detection_results';
export const CIC_STATEMENTS_TABLE = 'cic_statements';
export const COMMUNITY_MEMBERS_TABLE = 'community_members';
export const PROFILES_TABLE = 'profiles';
export const PROFILES_ACTIVITY_LOGS_TABLE = 'profile_activity_logs';
export const PROFILES_ARCHIVE_TABLE = 'profiles_archive';
export const TEAM_TABLE = 'team';
export const DISTRIBUTION_TABLE = 'distribution';
export const DISTRIBUTION_PHOTO_TABLE = 'distribution_photo';
export const CONSOLIDATED_OWNERS_METRICS_TABLE = 'owners_metrics_consolidation';
export const CONSOLIDATED_WALLETS_TDH_TABLE = 'tdh_consolidation';
export const CONSOLIDATED_OWNERS_TAGS_TABLE = 'owners_tags_consolidation';
export const TDH_GLOBAL_HISTORY_TABLE = 'tdh_global_history';
export const TDH_HISTORY_TABLE = 'tdh_history';
export const NFTDELEGATION_BLOCKS_TABLE = 'nftdelegation_blocks';
export const CONSOLIDATIONS_TABLE = 'consolidations';
export const DELEGATIONS_TABLE = 'delegations';
export const NFTS_HISTORY_TABLE = 'nfts_history';
export const NFTS_HISTORY_BLOCKS_TABLE = 'nfts_history_blocks';
export const NFTS_HISTORY_CLAIMS_TABLE = 'nfts_history_claims';
export const REMEMES_TABLE = 'rememes';
export const REMEMES_UPLOADS = 'uploads_rememes';
export const RATINGS_TABLE = 'ratings';
export const ROYALTIES_UPLOADS_TABLE = 'royalties_upload';
export const EVENTS_TABLE = 'events';
export const LISTENER_PROCESSED_EVENTS_TABLE = 'listener_processed_events';
export const CIC_SCORE_AGGREGATIONS_TABLE = 'cic_score_aggregations';
export const PROFILE_TOTAL_REP_SCORE_AGGREGATIONS_TABLE =
  'profile_total_rep_score_aggregations';
export const MEMES_CONTRACT = '0x33FD426905F149f8376e227d0C9D3340AaD17aF1';
export const GRADIENT_CONTRACT = '0x0c58ef43ff3032005e472cb5709f8908acb00205';
export const MEMELAB_CONTRACT = '0x4db52a61dc491e15a2f78f5ac001c14ffe3568cb';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_ADDRESS_DEAD = '0x000000000000000000000000000000000000dEaD';
export const MANIFOLD = '0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799';
export const PUNK_6529 = '0xfd22004806a6846ea67ad883356be810f0428793';
export const SIX529 = '0xB7d6ed1d7038BaB3634eE005FA37b925B11E9b13';
export const SIX529_ER = '0xE359aB04cEC41AC8C62bc5016C10C749c7De5480';
export const SIX529_MUSEUM = '0xc6400A5584db71e41B0E5dFbdC769b54B91256CD';
export const ENS_ADDRESS = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
export const ROYALTIES_ADDRESS = '0x1b1289e34fe05019511d7b436a5138f361904df0';
export const MEMELAB_ROYALTIES_ADDRESS =
  '0x900b67e6f16291431e469e6ec8208d17de09fc37';
export const OPENSEA_ADDRESS = '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC';
export const MEMES_DEPLOYER = '0x4B76837F8D8Ad0A28590d06E53dCD44b6B7D4554';

export const ACK_DEPLOYER = '0x03ee832367e29a5cd001f65093283eabb5382b62';
export const LOOKS_TOKEN_ADDRESS = '0xf4d2888d29d722226fafa5d9b24f9164c092421e';
export const WETH_TOKEN_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const ALCHEMY_SETTINGS = {
  network: Network.ETH_MAINNET,
  maxRetries: 10
};

export const INFURA_KEY = 'b496145d088a4fe5a5861a6db9ee2034';

export const CLOUDFRONT_DISTRIBUTION = 'ECGWRHUV1NM3I';
export const CLOUDFRONT_ID = 'd3lqz0a4bldqgf';
export const CLOUDFRONT_LINK = `https://${CLOUDFRONT_ID}.cloudfront.net`;

export const NFT_ORIGINAL_IMAGE_LINK = `${CLOUDFRONT_LINK}/images/original/`;

export const NFT_SCALED1000_IMAGE_LINK = `${CLOUDFRONT_LINK}/images/scaled_x1000/`;

export const NFT_SCALED450_IMAGE_LINK = `${CLOUDFRONT_LINK}/images/scaled_x450/`;

export const NFT_SCALED60_IMAGE_LINK = `${CLOUDFRONT_LINK}/images/scaled_x60/`;

export const NFT_VIDEO_LINK = `${CLOUDFRONT_LINK}/videos/`;
export const NFT_HTML_LINK = `${CLOUDFRONT_LINK}/html/`;

// export const DELEGATION_CONTRACT: {
//   chain_id: number;
//   contract: `0x${string}`;
// } = {
//   chain_id: 11155111,
//   contract: '0x8f86c644f845a077999939c69bc787662377d915'
// };
export const DELEGATION_CONTRACT: {
  chain_id: number;
  contract: `0x${string}`;
} = {
  chain_id: 1,
  contract: '0x2202CB9c00487e7e8EF21e6d8E914B32e709f43d'
};
export const DELEGATION_ALL_ADDRESS =
  '0x8888888888888888888888888888888888888888';

export const USE_CASE_ALL = 1;
export const USE_CASE_MINTING = 2;
export const USE_CASE_SUB_DELEGATION = 998;
export const USE_CASE_CONSOLIDATION = 999;
export const CONSOLIDATIONS_LIMIT = 3;
export const NEVER_DATE = 64060588800;

export const SZN1_INDEX = {
  start: 1,
  end: 47,
  count: 47
};
export const SZN2_INDEX = {
  start: 48,
  end: 86,
  count: 39
};
export const SZN3_INDEX = {
  start: 87,
  end: 118,
  count: 32
};
export const SZN4_INDEX = {
  start: 119,
  end: 151,
  count: 33
};

export const SZN5_INDEX = {
  start: 152,
  end: 180,
  count: 29
};

export const SZN6_INDEX = {
  start: 181
};

export const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const PROFILE_HANDLE_REGEX = /^[a-zA-Z0-9_]{3,15}$/;
export const MEMES_ROYALTIES_RATE = 0.5;
