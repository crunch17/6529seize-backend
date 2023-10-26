import fetch from 'node-fetch';
import * as db from '../../db-api';
import { loadLocalConfig, loadSecrets } from '../../secrets';
import { isNumber } from '../../helpers';
import {
  validateRememe,
  validateRememeAdd
} from './rememes/rememes_validation';
import { SEIZE_SETTINGS } from './api-constants';
import { validateUser } from './users/user_validation';

import votesRoutes from './votes/votes.routes';
import profilesRoutes from './profiles/profiles.routes';
import authRoutes from './auth/auth.routes';
import * as passport from 'passport';
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  VerifiedCallback
} from 'passport-jwt';
import { getJwtSecret } from './auth/auth';
import * as console from 'console';
import { NextFunction, Request, Response } from 'express';
import { Time } from '../../time';
import * as sentryContext from '../../sentry.context';
import * as Sentry from '@sentry/serverless';
import { asyncRouter } from './async.router';
import { ApiCompliantException } from '../../exceptions';
import { Strategy as AnonymousStrategy } from 'passport-anonymous';

const converter = require('json-2-csv');

const mcache = require('memory-cache');

const CACHE_TIME_MS = 1 * 60 * 1000;

function cacheKey(req: any) {
  return `__SEIZE_CACHE_${process.env.NODE_ENV}__` + req.originalUrl || req.url;
}

function requestLogMiddleware() {
  return (request: Request, response: Response, next: NextFunction) => {
    const { method, originalUrl: url } = request;
    const start = Time.now();
    response.on('close', () => {
      const { statusCode } = response;

      console.log(
        new Date(),
        `[API] ${method} ${url} - Response status: HTTP_${statusCode} - Running time: ${start.diffFromNow()}`
      );
    });
    next();
  };
}

function customErrorMiddleware() {
  return (err: Error, _: Request, res: Response, next: NextFunction) => {
    if (err instanceof ApiCompliantException) {
      res.status(err.getStatusCode()).send({ error: err.message });
      next();
    } else {
      res.status(500).send({ error: 'Something went wrong...' });
      next(err);
    }
  };
}

function sentryFlusherMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    Sentry.flush(Time.seconds(2).toMillis()).then(() => {
      next(err);
    });
  };
}

const compression = require('compression');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const rootRouter = asyncRouter();

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'x-6529-auth',
    'Origin',
    'Accept',
    'X-Requested-With',
    'Authorization'
  ]
};

async function loadApiSecrets() {
  if (process.env.API_LOAD_SECRETS === 'true') {
    await loadSecrets();
  }
}

async function loadApi() {
  await loadLocalConfig();
  await db.connect();
}

loadApi().then(() => {
  console.log(
    '[API]',
    `[DB HOST ${process.env.DB_HOST_READ}]`,
    `[API PASSWORD ACTIVE ${process.env.ACTIVATE_API_PASSWORD}]`,
    `[LOAD SECRETS ENABLED ${process.env.API_LOAD_SECRETS}]`
  );

  loadApiSecrets().then(() => {
    passport.use(
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          secretOrKey: getJwtSecret()
        },
        function ({ sub: wallet }: { sub: string }, cb: VerifiedCallback) {
          return cb(null, { wallet: wallet });
        }
      )
    );
  });
  passport.use(new AnonymousStrategy());
  app.use(requestLogMiddleware());
  app.use(compression());
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'"]
        }
      },
      referrerPolicy: {
        policy: 'same-origin'
      },
      frameguard: {
        action: 'sameorigin'
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      },
      nosniff: true,
      permissionsPolicy: {
        policy: {
          accelerometer: "'none'",
          camera: "'none'",
          geolocation: "'none'",
          microphone: "'none'",
          payment: "'none'"
        }
      }
    })
  );
  app.enable('trust proxy');

  const pass = process.env.API_PASSWORD
    ? process.env.API_PASSWORD.split(',')
    : [];

  const requireLogin = async (req: any, res: any, next: any) => {
    if (req.method == 'OPTIONS') {
      next();
    } else if (
      process.env.ACTIVATE_API_PASSWORD &&
      process.env.ACTIVATE_API_PASSWORD === 'true'
    ) {
      const auth = req.headers['x-6529-auth'];
      if (!auth || !pass.includes(auth)) {
        console.log(`Unauthorized request for ${req.path} auth: ${auth}`);
        res.statusCode = 401;
        const image = await db.fetchRandomImage();
        res.end(
          JSON.stringify({
            image: image[0].scaled ? image[0].scaled : image[0].image
          })
        );
      } else {
        next();
      }
    } else {
      next();
    }
  };

  const checkCache = function (req: any, res: any, next: any) {
    const key = cacheKey(req);

    const cachedBody = mcache.get(key);
    if (cachedBody) {
      returnPaginatedResult(cachedBody, req, res, true);
    } else {
      next();
    }
  };

  const BASE_PATH = '/api';
  const apiRouter = asyncRouter();

  app.all(`${BASE_PATH}*`, requireLogin);
  app.all(`${BASE_PATH}*`, checkCache);

  const CONTENT_TYPE_HEADER = 'Content-Type';
  const JSON_HEADER_VALUE = 'application/json';
  const DEFAULT_PAGE_SIZE = 50;
  const NFTS_PAGE_SIZE = 101;
  const DISTRIBUTION_PAGE_SIZE = 250;
  const SORT_DIRECTIONS = ['ASC', 'DESC'];

  const DISTRIBUTION_SORT = [
    'phase',
    'card_mint_count',
    'count',
    'wallet_tdh',
    'wallet_balance',
    'wallet_unique_balance'
  ];

  const NFT_TDH_SORT = [
    'card_tdh',
    'card_tdh__raw',
    'card_balance',
    'total_tdh',
    'total_balance',
    'total_tdh__raw'
  ];

  const REMEMES_SORT = ['created_at'];

  const MEME_LAB_OWNERS_SORT = ['balance'];

  const TDH_SORT = [
    'boosted_tdh',
    'tdh',
    'tdh__raw',
    'tdh_rank',
    'boosted_memes_tdh',
    'memes_tdh',
    'memes_tdh__raw',
    'boosted_memes_tdh_season1',
    'memes_tdh_season1',
    'memes_tdh_season1__raw',
    'boosted_memes_tdh_season2',
    'memes_tdh_season2',
    'memes_tdh_season2__raw',
    'boosted_memes_tdh_season3',
    'memes_tdh_season3',
    'memes_tdh_season3__raw',
    'boosted_memes_tdh_season4',
    'memes_tdh_season4',
    'memes_tdh_season4__raw',
    'boosted_memes_tdh_season5',
    'memes_tdh_season5',
    'memes_tdh_season5__raw',
    'memes_balance',
    'memes_balance_season1',
    'memes_balance_season2',
    'memes_balance_season3',
    'memes_balance_season4',
    'memes_balance_season5',
    'boosted_gradients_tdh',
    'gradients_tdh',
    'gradients_tdh__raw',
    'gradients_balance',
    'balance',
    'purchases_value',
    'purchases_count',
    'sales_value',
    'sales_count',
    'purchases_value_memes',
    'purchases_value_memes_season1',
    'purchases_value_memes_season2',
    'purchases_value_memes_season3',
    'purchases_value_memes_season4',
    'purchases_value_memes_season5',
    'purchases_value_gradients',
    'purchases_count_memes',
    'purchases_count_memes_season1',
    'purchases_count_memes_season2',
    'purchases_count_memes_season3',
    'purchases_count_memes_season4',
    'purchases_count_memes_season5',
    'purchases_count_gradients',
    'sales_value_memes',
    'sales_value_memes_season1',
    'sales_value_memes_season2',
    'sales_value_memes_season3',
    'sales_value_memes_season4',
    'sales_value_memes_season5',
    'sales_value_gradients',
    'sales_count_memes',
    'sales_count_memes_season1',
    'sales_count_memes_season2',
    'sales_count_memes_season3',
    'sales_count_memes_season4',
    'sales_count_memes_season5',
    'sales_count_gradients',
    'transfers_in',
    'transfers_in_memes',
    'transfers_in_memes_season1',
    'transfers_in_memes_season2',
    'transfers_in_memes_season3',
    'transfers_in_memes_season4',
    'transfers_in_memes_season5',
    'transfers_in_gradients',
    'transfers_out',
    'transfers_out_memes',
    'transfers_out_memes_season1',
    'transfers_out_memes_season2',
    'transfers_out_memes_season3',
    'transfers_out_memes_season4',
    'transfers_out_memes_season5',
    'transfers_out_gradients',
    'memes_cards_sets',
    'memes_cards_sets_szn1',
    'memes_cards_sets_szn2',
    'memes_cards_sets_szn3',
    'memes_cards_sets_szn4',
    'memes_cards_sets_szn5',
    'memes_cards_sets_minus1',
    'memes_cards_sets_minus2',
    'genesis',
    'unique_memes',
    'unique_memes_szn1',
    'unique_memes_szn2',
    'unique_memes_szn3',
    'unique_memes_szn4',
    'unique_memes_szn5',
    'day_change',
    'day_change_unboosted'
  ];

  const TAGS_FILTERS = [
    'memes',
    'memes_set',
    'memes_set_minus1',
    'memes_set_szn1',
    'memes_set_szn2',
    'memes_set_szn3',
    'memes_set_szn4',
    'memes_set_szn5',
    'memes_genesis',
    'gradients'
  ];

  const TRANSACTION_FILTERS = [
    'sales',
    'transfers',
    'airdrops',
    'mints',
    'burns'
  ];

  function fullUrl(req: any, next: boolean) {
    let url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!next) {
      return null;
    }

    const newUrl = new URL(url);
    const params = newUrl.searchParams;

    if (params.has('page')) {
      const page = parseInt(params.get('page')!);
      newUrl.searchParams.delete('page');
      newUrl.searchParams.append('page', String(page + 1));
      return newUrl.toString();
    } else {
      if (!url.includes('?')) {
        url += '?';
      }
      return (url += `&page=2`);
    }
  }

  function returnPaginatedResult(
    result: db.DBResponse,
    req: any,
    res: any,
    skipCache?: boolean
  ) {
    result.next = fullUrl(req, result.next);

    if (!skipCache && result.count > 0) {
      mcache.put(cacheKey(req), result, CACHE_TIME_MS);
    }

    res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders);

    res.end(JSON.stringify(result));
  }

  apiRouter.get(`/blocks`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    db.fetchBlocks(pageSize, page).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/settings`, function (_: any, res: any) {
    res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
    res.end(JSON.stringify(SEIZE_SETTINGS));
  });

  apiRouter.get(`/uploads`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    const block = isNumber(req.query.block) ? parseInt(req.query.block) : 0;
    const date = req.query.date;
    db.fetchUploads(pageSize, page, block, date).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/consolidated_uploads`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    const block = isNumber(req.query.block) ? parseInt(req.query.block) : 0;
    const date = req.query.date;
    db.fetchConsolidatedUploads(pageSize, page, block, date).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/artists`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const meme_nfts = req.query.meme_id;

    db.fetchArtists(pageSize, page, meme_nfts).then((result) => {
      result.data.map((a: any) => {
        a.memes = JSON.parse(a.memes);
        a.memelab = JSON.parse(a.memelab);
        a.gradients = JSON.parse(a.gradients);
        a.work = JSON.parse(a.work);
        a.social_links = JSON.parse(a.social_links);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/nfts`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size <= NFTS_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const contracts = req.query.contract;
    const nfts = req.query.id;
    db.fetchNFTs(pageSize, page, contracts, nfts, sortDir).then((result) => {
      result.data.map((d: any) => {
        d.metadata = JSON.parse(d.metadata);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/nfts/gradients`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size <= NFTS_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'asc';

    const sort =
      req.query.sort && ['id', 'tdh'].includes(req.query.sort)
        ? req.query.sort
        : 'id';

    db.fetchGradients(pageSize, page, sort, sortDir).then((result) => {
      result.data.map((d: any) => {
        d.metadata = JSON.parse(d.metadata);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/nfts_memelab`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const contracts = req.query.contract;
    const nfts = req.query.id;
    const memeIds = req.query.meme_id;

    db.fetchLabNFTs(memeIds, pageSize, page, contracts, nfts, sortDir).then(
      (result) => {
        result.data.map((d: any) => {
          d.meme_references = JSON.parse(d.meme_references);
          d.metadata = JSON.parse(d.metadata);
          if (
            d.metadata.animation_details &&
            typeof d.metadata.animation_details === 'string'
          ) {
            d.metadata.animation_details = JSON.parse(
              d.metadata.animation_details
            );
          }
        });
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/memes_extended_data`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size <= NFTS_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const nfts = req.query.id;
    const seasons = req.query.season;
    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    db.fetchMemesExtended(pageSize, page, nfts, seasons, sortDir).then(
      (result) => {
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/memes_seasons`, function (req: any, res: any) {
    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'asc';

    db.fetchMemesSeasons(sortDir).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/memes_lite`, function (req: any, res: any) {
    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'asc';

    db.fetchMemesLite(sortDir).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/lab_extended_data`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const nfts = req.query.id;
    const collections = req.query.collection;

    db.fetchLabExtended(pageSize, page, nfts, collections).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/:address/nfts`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const address = req.params.address;
    db.fetchNFTsForWallet(address, pageSize, page).then((result) => {
      result.data.map((d: any) => {
        d.metadata = JSON.parse(d.metadata);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/owners_memelab`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const sort =
      req.query.sort && MEME_LAB_OWNERS_SORT.includes(req.query.sort)
        ? req.query.sort
        : 'balance';

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const wallets = req.query.wallet;
    const nfts = req.query.id;
    db.fetchLabOwners(pageSize, page, wallets, nfts, sort, sortDir).then(
      (result) => {
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/owners`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const wallets = req.query.wallet;
    const contracts = req.query.contract;
    const nfts = req.query.id;
    db.fetchOwners(pageSize, page, wallets, contracts, nfts).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/owners_tags`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const wallets = req.query.wallet;

    db.fetchOwnersTags(pageSize, page, wallets).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/transactions`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const wallets = req.query.wallet;
    const contracts = req.query.contract;
    const nfts = req.query.id;

    const filter =
      req.query.filter && TRANSACTION_FILTERS.includes(req.query.filter)
        ? req.query.filter
        : null;
    db.fetchTransactions(pageSize, page, wallets, contracts, nfts, filter).then(
      (result) => {
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/transactions_memelab`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const wallets = req.query.wallet;
    const nfts = req.query.id;

    const filter =
      req.query.filter && TRANSACTION_FILTERS.includes(req.query.filter)
        ? req.query.filter
        : null;

    db.fetchLabTransactions(pageSize, page, wallets, nfts, filter).then(
      (result) => {
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/tdh/gradients/`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    db.fetchGradientTdh(pageSize, page).then((result) => {
      result.data.map((d: any) => {
        d.memes = JSON.parse(d.memes);
        d.memes_ranks = JSON.parse(d.memes_ranks);
        d.gradients = JSON.parse(d.gradients);
        d.gradients_ranks = JSON.parse(d.gradients_ranks);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/ens/:address/`, function (req: any, res: any) {
    const address = req.params.address;

    db.fetchEns(address).then((result) => {
      res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
      if (result.length == 1) {
        res.end(JSON.stringify(result[0]));
      } else {
        res.end(JSON.stringify({}));
      }
    });
  });

  apiRouter.get(`/user/:address/`, function (req: any, res: any) {
    const address = req.params.address;

    db.fetchUser(address).then((result) => {
      res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
      if (result.length == 1) {
        res.end(JSON.stringify(result[0]));
      } else {
        res.end(JSON.stringify({}));
      }
    });
  });

  apiRouter.get(`/tdh/:contract/:nft_id`, function (req: any, res: any) {
    const contract = req.params.contract;
    const nftId = req.params.nft_id;

    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const sort =
      req.query.sort && NFT_TDH_SORT.includes(req.query.sort)
        ? req.query.sort
        : 'card_tdh';

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const wallets = req.query.wallet;

    db.fetchNftTdh(
      pageSize,
      page,
      contract,
      nftId,
      wallets,
      sort,
      sortDir
    ).then((result) => {
      result.data.map((d: any) => {
        d.memes = JSON.parse(d.memes);
        d.memes_ranks = JSON.parse(d.memes_ranks);
        d.gradients = JSON.parse(d.gradients);
        d.gradients_ranks = JSON.parse(d.gradients_ranks);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(
    `/consolidated_tdh/:contract/:nft_id`,
    function (req: any, res: any) {
      const contract = req.params.contract;
      const nftId = req.params.nft_id;

      const pageSize: number =
        req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
          ? parseInt(req.query.page_size)
          : DEFAULT_PAGE_SIZE;
      const page: number = req.query.page ? parseInt(req.query.page) : 1;

      const sort =
        req.query.sort && NFT_TDH_SORT.includes(req.query.sort)
          ? req.query.sort
          : 'card_tdh';

      const sortDir =
        req.query.sort_direction &&
        SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
          ? req.query.sort_direction
          : 'desc';

      const wallets = req.query.wallet;
      db.fetchConsolidatedNftTdh(
        pageSize,
        page,
        contract,
        nftId,
        wallets,
        sort,
        sortDir
      ).then((result) => {
        result.data.map((d: any) => {
          d.memes = JSON.parse(d.memes);
          d.memes_ranks = JSON.parse(d.memes_ranks);
          d.gradients = JSON.parse(d.gradients);
          d.gradients_ranks = JSON.parse(d.gradients_ranks);
          d.wallets = JSON.parse(d.wallets);
        });
        returnPaginatedResult(result, req, res);
      });
    }
  );

  apiRouter.get(`/tdh`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const wallets = req.query.wallet;
    const sort =
      req.query.sort && TDH_SORT.includes(req.query.sort)
        ? req.query.sort
        : 'boosted_tdh';

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const filter =
      req.query.filter && TAGS_FILTERS.includes(req.query.filter)
        ? req.query.filter
        : null;

    const hideMuseum =
      req.query.hide_museum && req.query.hide_museum == 'true' ? true : false;

    const hideTeam =
      req.query.hide_team && req.query.hide_team == 'true' ? true : false;

    db.fetchTDH(
      pageSize,
      page,
      wallets,
      sort,
      sortDir,
      filter,
      hideMuseum,
      hideTeam
    ).then((result) => {
      result.data.map((d: any) => {
        d.memes = JSON.parse(d.memes);
        d.memes_ranks = JSON.parse(d.memes_ranks);
        d.gradients = JSON.parse(d.gradients);
        d.gradients_ranks = JSON.parse(d.gradients_ranks);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/owner_metrics`, function (req: any, res: any) {
    let pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    let page: number = req.query.page ? parseInt(req.query.page) : 1;

    const downloadPage = req.query.download_page == 'true';
    const downloadAll = req.query.download_all == 'true';
    if (downloadAll) {
      pageSize = Number.MAX_SAFE_INTEGER;
      page = 1;
    }

    const wallets = req.query.wallet;
    const sort =
      req.query.sort && TDH_SORT.includes(req.query.sort)
        ? req.query.sort
        : 'boosted_tdh';

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const filter =
      req.query.filter && TAGS_FILTERS.includes(req.query.filter)
        ? req.query.filter
        : null;

    const hideMuseum =
      req.query.hide_museum && req.query.hide_museum == 'true' ? true : false;

    const hideTeam =
      req.query.hide_team && req.query.hide_team == 'true' ? true : false;

    const isProfilePage =
      req.query.profile_page && req.query.profile_page == 'true' ? true : false;
    db.fetchOwnerMetrics(
      pageSize,
      page,
      wallets,
      sort,
      sortDir,
      filter,
      hideMuseum,
      hideTeam,
      isProfilePage
    ).then(async (result) => {
      if (downloadAll || downloadPage) {
        result.data.map((d: any) => {
          delete d.created_at;
          delete d.memes;
          delete d.memes_ranks;
          delete d.gradients;
          delete d.gradients_ranks;
        });
      } else {
        result.data.map((d: any) => {
          if (d.memes) {
            d.memes = JSON.parse(d.memes);
          }
          if (d.memes_ranks) {
            d.memes_ranks = JSON.parse(d.memes_ranks);
          }
          if (d.gradients) {
            d.gradients = JSON.parse(d.gradients);
          }
          if (d.gradients_ranks) {
            d.gradients_ranks = JSON.parse(d.gradients_ranks);
          }
        });
      }
      if (downloadAll) {
        const filename = 'consolidated_owner_metrics';
        const csv = await converter.json2csvAsync(result.data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
      } else if (downloadPage) {
        const filename = 'consolidated_owner_metrics';
        const csv = await converter.json2csvAsync(result.data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
      } else {
        return returnPaginatedResult(result, req, res);
      }
    });
  });

  apiRouter.get(
    `/consolidated_owner_metrics/:consolidation_key`,
    function (req: any, res: any) {
      const consolidationKey = req.params.consolidation_key;

      db.fetchConsolidatedOwnerMetricsForKey(consolidationKey).then(
        async (d) => {
          res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
          res.setHeader(
            'Access-Control-Allow-Headers',
            corsOptions.allowedHeaders
          );

          if (d) {
            if (d.wallets) {
              if (!Array.isArray(d.wallets)) {
                d.wallets = JSON.parse(d.wallets);
              }
            }
            if (d.memes) {
              d.memes = JSON.parse(d.memes);
            }
            if (d.memes_ranks) {
              d.memes_ranks = JSON.parse(d.memes_ranks);
            }
            if (d.gradients) {
              d.gradients = JSON.parse(d.gradients);
            }
            if (d.gradients_ranks) {
              d.gradients_ranks = JSON.parse(d.gradients_ranks);
            }
            mcache.put(cacheKey(req), d, CACHE_TIME_MS);
            res.end(JSON.stringify(d));
          }
          return res.end('{}');
        }
      );
    }
  );

  apiRouter.get(`/consolidated_owner_metrics`, function (req: any, res: any) {
    let pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    let page: number = req.query.page ? parseInt(req.query.page) : 1;
    const includePrimaryWallet =
      req.query.include_primary_wallet &&
      req.query.include_primary_wallet == 'true';

    const wallets = req.query.wallet;
    const downloadPage = req.query.download_page == 'true';
    const downloadAll = req.query.download_all == 'true';
    if (downloadAll) {
      pageSize = Number.MAX_SAFE_INTEGER;
      page = 1;
    }
    const sort =
      req.query.sort && TDH_SORT.includes(req.query.sort)
        ? req.query.sort
        : 'boosted_tdh';

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';

    const filter =
      req.query.filter && TAGS_FILTERS.includes(req.query.filter)
        ? req.query.filter
        : null;

    const hideMuseum =
      req.query.hide_museum && req.query.hide_museum == 'true' ? true : false;

    const hideTeam =
      req.query.hide_team && req.query.hide_team == 'true' ? true : false;

    const isProfilePage =
      req.query.profile_page && req.query.profile_page == 'true' ? true : false;

    db.fetchConsolidatedOwnerMetrics(
      pageSize,
      page,
      wallets,
      sort,
      sortDir,
      filter,
      hideMuseum,
      hideTeam,
      isProfilePage,
      includePrimaryWallet
    ).then(async (result) => {
      result.data.map((d: any) => {
        if (d.wallets) {
          if (!Array.isArray(d.wallets)) {
            d.wallets = JSON.parse(d.wallets);
          }
        }
      });
      if (downloadAll || downloadPage) {
        result.data.map((d: any) => {
          delete d.created_at;
          delete d.memes;
          delete d.memes_ranks;
          delete d.gradients;
          delete d.gradients_ranks;
        });
      } else {
        result.data.map((d: any) => {
          if (d.memes) {
            d.memes = JSON.parse(d.memes);
          }
          if (d.memes_ranks) {
            d.memes_ranks = JSON.parse(d.memes_ranks);
          }
          if (d.gradients) {
            d.gradients = JSON.parse(d.gradients);
          }
          if (d.gradients_ranks) {
            d.gradients_ranks = JSON.parse(d.gradients_ranks);
          }
        });
      }
      if (downloadAll) {
        const filename = 'consolidated_owner_metrics';
        const csv = await converter.json2csvAsync(result.data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
      } else if (downloadPage) {
        const filename = 'consolidated_owner_metrics';
        const csv = await converter.json2csvAsync(result.data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
      } else {
        return returnPaginatedResult(result, req, res);
      }
    });
  });

  apiRouter.get(`/team`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    db.fetchTeam(pageSize, page).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(
    `/distribution_photos/:contract/:nft_id`,
    function (req: any, res: any) {
      const contract = req.params.contract;
      const nftId = req.params.nft_id;

      const pageSize: number =
        req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
          ? parseInt(req.query.page_size)
          : DEFAULT_PAGE_SIZE;
      const page: number = req.query.page ? parseInt(req.query.page) : 1;

      db.fetchDistributionPhotos(contract, nftId, pageSize, page).then(
        (result) => {
          returnPaginatedResult(result, req, res);
        }
      );
    }
  );

  apiRouter.get(
    `/distribution_phases/:contract/:nft_id`,
    function (req: any, res: any) {
      const contract = req.params.contract;
      const nftId = req.params.nft_id;
      db.fetchDistributionPhases(contract, nftId).then((result) => {
        returnPaginatedResult(result, req, res);
      });
    }
  );

  apiRouter.get(
    `/distribution/:contract/:nft_id`,
    function (req: any, res: any) {
      const contract = req.params.contract;
      const nftId = req.params.nft_id;
      const wallets = req.query.wallet;
      const phases = req.query.phase;

      const pageSize: number =
        req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
          ? parseInt(req.query.page_size)
          : DISTRIBUTION_PAGE_SIZE;
      const page: number = req.query.page ? parseInt(req.query.page) : 1;

      const sort =
        req.query.sort && DISTRIBUTION_SORT.includes(req.query.sort)
          ? req.query.sort
          : 'phase';

      const sortDir =
        req.query.sort_direction &&
        SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
          ? req.query.sort_direction
          : 'desc';
      db.fetchDistributionForNFT(
        contract,
        nftId,
        wallets,
        phases,
        pageSize,
        page,
        sort,
        sortDir
      ).then((result) => {
        returnPaginatedResult(result, req, res);
      });
    }
  );

  apiRouter.get(`/distributions`, function (req: any, res: any) {
    const wallets = req.query.wallet;
    const cards = req.query.card_id;
    const contracts = req.query.contract;

    const pageSize: number =
      req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    db.fetchDistributions(wallets, cards, contracts, pageSize, page).then(
      (result) => {
        returnPaginatedResult(result, req, res);
      }
    );
  });

  apiRouter.get(`/consolidations/:wallet`, function (req: any, res: any) {
    const wallet = req.params.wallet;
    const showIncomplete =
      req.query.show_incomplete && req.query.show_incomplete == 'true'
        ? true
        : false;
    db.fetchConsolidationsForWallet(wallet, showIncomplete).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/consolidations`, function (req: any, res: any) {
    const block = req.query.block;
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    db.fetchConsolidations(pageSize, page, block).then((result) => {
      result.data.map((a: any) => {
        a.wallets = JSON.parse(a.wallets);
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/consolidation_transactions`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    const block = req.query.block;
    const showIncomplete =
      req.query.show_incomplete && req.query.show_incomplete == 'true'
        ? true
        : false;
    db.fetchConsolidationTransactions(
      pageSize,
      page,
      block,
      showIncomplete
    ).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/delegations/:wallet`, function (req: any, res: any) {
    const wallet = req.params.wallet;

    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    db.fetchDelegations(wallet, pageSize, page).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/delegations`, function (req: any, res: any) {
    const use_cases = req.query.use_case;
    const collections = req.query.collection;
    const pageSize: number =
      req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    const showExpired =
      req.query.show_expired && req.query.show_expired == 'true' ? true : false;
    const block = req.query.block;

    db.fetchDelegationsByUseCase(
      collections,
      use_cases,
      showExpired,
      pageSize,
      page,
      block
    ).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(
    `/nft_history/:contract/:nft_id`,
    function (req: any, res: any) {
      const contract = req.params.contract;
      const nftId = req.params.nft_id;

      const pageSize: number =
        req.query.page_size && req.query.page_size < DEFAULT_PAGE_SIZE
          ? parseInt(req.query.page_size)
          : DEFAULT_PAGE_SIZE;
      const page: number = req.query.page ? parseInt(req.query.page) : 1;

      db.fetchNftHistory(pageSize, page, contract, nftId).then((result) => {
        result.data.map((a: any) => {
          a.description = JSON.parse(a.description);
        });
        returnPaginatedResult(result, req, res);
      });
    }
  );

  rootRouter.get(`/floor_price`, async function (req: any, res: any) {
    const contract = req.query.contract;
    const id = req.query.id;

    if (!contract || !id) {
      res.status(400).send('Missing contract or id');
      return;
    }
    const url = `https://api.opensea.io/v2/orders/ethereum/seaport/listings?asset_contract_address=${contract}&limit=1&token_ids=${id}&order_by=eth_price&order_direction=asc`;
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY!,
        accept: 'application/json'
      }
    });
    const json = await response.json();
    return res.send(json);
  });

  apiRouter.get(
    `/next_gen/:merkle_root/:address`,
    async function (req: any, res: any) {
      const merkleRoot = req.params.merkle_root;
      const address = req.params.address;

      db.fetchNextGenAllowlist(merkleRoot, address).then((result) => {
        res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
        res.end(JSON.stringify(result));
      });
    }
  );

  apiRouter.get(`/rememes`, function (req: any, res: any) {
    const memeIds = req.query.meme_id;
    const pageSize: number =
      req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    const contract = req.query.contract;
    const id = req.query.id;
    const tokenType = req.query.token_type;

    const sort =
      req.query.sort && REMEMES_SORT.includes(req.query.sort)
        ? req.query.sort
        : undefined;

    const sortDir =
      req.query.sort_direction &&
      SORT_DIRECTIONS.includes(req.query.sort_direction.toUpperCase())
        ? req.query.sort_direction
        : 'desc';
    db.fetchRememes(
      memeIds,
      pageSize,
      page,
      contract,
      id,
      tokenType,
      sort,
      sortDir
    ).then((result) => {
      result.data.map((a: any) => {
        a.metadata = JSON.parse(a.metadata);
        a.media = JSON.parse(a.media);
        a.contract_opensea_data = JSON.parse(a.contract_opensea_data);
        a.meme_references = JSON.parse(a.meme_references);
        a.replicas = a.replicas.split(',');
      });
      returnPaginatedResult(result, req, res, true);
    });
  });

  apiRouter.post(
    `/rememes/validate`,
    validateRememe,
    function (req: any, res: any) {
      const body = req.validatedBody;
      res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders);
      res
        .status(body.valid ? 200 : 400)
        .send(JSON.stringify(body))
        .end();
    }
  );

  apiRouter.post(
    `/rememes/add`,
    validateRememeAdd,
    function (req: any, res: any) {
      const body = req.validatedBody;
      const valid = body.valid;
      res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders);
      if (valid) {
        db.addRememe(req.body.address, body).then((result) => {
          res.status(201).send(JSON.stringify(body));
          res.end();
        });
      } else {
        res.status(400).send(JSON.stringify(body));
        res.end();
      }
    }
  );

  apiRouter.get(`/rememes_uploads`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;

    db.fetchRememesUploads(pageSize, page).then((result) => {
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/tdh_global_history`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    db.fetchTDHGlobalHistory(pageSize, page).then((result) => {
      result.data.map((d: any) => {
        const date = new Date(d.date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        d.date = `${year}-${month}-${day}`;
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(`/tdh_history`, function (req: any, res: any) {
    const pageSize: number =
      req.query.page_size && req.query.page_size < DISTRIBUTION_PAGE_SIZE
        ? parseInt(req.query.page_size)
        : DEFAULT_PAGE_SIZE;
    const page: number = req.query.page ? parseInt(req.query.page) : 1;
    const wallets = req.query.wallet;
    db.fetchTDHHistory(wallets, pageSize, page).then((result) => {
      result.data.map((d: any) => {
        d.wallets = JSON.parse(d.wallets);
        const date = new Date(d.date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        d.date = `${year}-${month}-${day}`;
      });
      returnPaginatedResult(result, req, res);
    });
  });

  apiRouter.get(``, async function (req: any, res: any) {
    const image = await db.fetchRandomImage();
    res
      .setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE)
      .setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders)
      .send(
        JSON.stringify({
          message: '6529 SEIZE API',
          image: image[0].scaled ? image[0].scaled : image[0].image
        })
      );
  });

  apiRouter.post(
    `/user`,
    upload.single('pfp'),
    validateUser,
    function (req: any, res: any) {
      const body = req.validatedBody;
      const valid = body.valid;
      res.setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE);
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders);
      if (valid) {
        db.updateUser(body.user).then((result) => {
          res.status(200).send(JSON.stringify(body));
          res.end();
        });
      } else {
        res.status(400).send(JSON.stringify(body));
        res.end();
      }
    }
  );

  rootRouter.get(``, async function (_: any, res: any) {
    const image = await db.fetchRandomImage();
    res
      .setHeader(CONTENT_TYPE_HEADER, JSON_HEADER_VALUE)
      .setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders)
      .send(
        JSON.stringify({
          message: 'FOR 6529 SEIZE API GO TO /api',
          image: image[0].scaled ? image[0].scaled : image[0].image
        })
      );
  });

  apiRouter.use(`/votes`, votesRoutes);
  apiRouter.use(`/profiles`, profilesRoutes);
  apiRouter.use(`/auth`, authRoutes);
  rootRouter.use(BASE_PATH, apiRouter);
  app.use(rootRouter);

  app.use(customErrorMiddleware());

  if (sentryContext.isConfigured()) {
    app.use(Sentry.Handlers.errorHandler());
    app.use(sentryFlusherMiddleware());
  }

  app.listen(3000, function () {
    console.log(
      new Date(),
      `[API]`,
      `[CONFIG ${process.env.NODE_ENV}]`,
      '[SERVER RUNNING ON PORT 3000]'
    );
  });
});

export { app };
