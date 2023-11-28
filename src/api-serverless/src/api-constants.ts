import { Time } from '../../time';

export const SEIZE_SETTINGS = {
  rememes_submission_tdh_threshold: 6942
};

export const ACCESS_CONTROL_ALLOW_ORIGIN_HEADER =
  'Access-Control-Allow-Headers';
export const CONTENT_TYPE_HEADER = 'Content-Type';
export const JSON_HEADER_VALUE = 'application/json';
export const CONNECTED_WALLET_HEADER = 'x-connected-wallet';
export const DEFAULT_PAGE_SIZE = 50;
export const NFTS_PAGE_SIZE = 101;
export const DISTRIBUTION_PAGE_SIZE = 250;
export const SORT_DIRECTIONS = ['ASC', 'DESC'];
export const CACHE_TIME_MS = Time.minutes(1).toMillis();

export const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'x-6529-auth',
    'Origin',
    'Accept',
    'X-Requested-With',
    'Authorization',
    CONNECTED_WALLET_HEADER
  ]
};

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  next: string | null | boolean;
  data: T[];
}
