import { Request, Response } from 'express';
import { ApiResponse } from '../api-response';
import {
  getAuthenticatedWalletOrNull,
  getConnectedWalletOrNull,
  getWalletOrThrow,
  maybeAuthenticatedUser,
  needsAuthenticatedUser
} from '../auth/auth';
import * as Joi from 'joi';
import { PROFILE_HANDLE_REGEX, WALLET_REGEX } from '../../../constants';
import { getValidatedByJoiOrThrow } from '../validation';
import { NotFoundException } from '../../../exceptions';
import { initMulterSingleMiddleware } from '../multer-middleware';

import { asyncRouter } from '../async.router';
import { RESERVED_HANDLES } from './profiles.constats';
import { Profile, ProfileClassification } from '../../../entities/IProfile';
import {
  CreateOrUpdateProfileCommand,
  ProfileAndConsolidations
} from '../../../profiles/profile.types';
import { profilesService } from '../../../profiles/profiles.service';
import { cicRatingsService } from '../../../rates/cic-ratings.service';
import { Wallet } from '../../../entities/IWallet';
import { AggregatedCicRating } from '../../../rates/rates.types';

const router = asyncRouter();

export interface ApiGetProfileResponse {
  readonly profile: Profile | null;
  readonly consolidation: {
    wallets: { wallet: Wallet; tdh: number }[];
    tdh: number;
  };
  readonly level: number;
  readonly cic: AggregatedCicRating & {
    readonly authenticated_profile_contribution: number;
    readonly cic_left_for_authenticated_profile: number;
  };
}

async function prepProfileApiResponse(
  profile: ProfileAndConsolidations,
  req: Request<
    {
      handleOrWallet: string;
    },
    any,
    any,
    any,
    any
  >
) {
  const targetProfileId = profile.profile?.external_id;
  const connectedWallet =
    getAuthenticatedWalletOrNull(req) ?? getConnectedWalletOrNull(req);
  const authenticatedProfileId = connectedWallet
    ? await profilesService.getProfileIdByWallet(connectedWallet)
    : null;
  let cic_left_for_authenticated_profile = 0;
  let authenticated_profile_contribution = 0;
  if (targetProfileId && authenticatedProfileId) {
    cic_left_for_authenticated_profile =
      await cicRatingsService.getCicRatesLeftForProfile(authenticatedProfileId);
    authenticated_profile_contribution =
      await cicRatingsService.getProfilesAggregatedCicRatingForProfile(
        targetProfileId,
        authenticatedProfileId
      );
  }
  return {
    profile: profile.profile,
    consolidation: profile.consolidation,
    level: profile.level,
    cic: {
      ...profile.cic,
      authenticated_profile_contribution,
      cic_left_for_authenticated_profile
    }
  };
}

router.get(
  `/:handleOrWallet`,
  async function (
    req: Request<
      {
        handleOrWallet: string;
      },
      any,
      any,
      any,
      any
    >,
    res: Response<ApiResponse<ApiGetProfileResponse>>
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const profile =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    const resp = await prepProfileApiResponse(profile, req);
    res.status(200).send(resp);
  }
);

router.get(
  `/:handle/availability`,
  maybeAuthenticatedUser(),
  async function (
    req: Request<
      {
        handle: string;
      },
      any,
      any,
      any,
      any
    >,
    res: Response<ApiResponse<{ available: boolean; message: string }>>
  ) {
    const maybeAuthenticatedWallet = getAuthenticatedWalletOrNull(req);
    const proposedHandle = req.params.handle.toLowerCase();
    if (!proposedHandle.match(PROFILE_HANDLE_REGEX)) {
      return res.status(200).send({
        available: false,
        message: `Invalid username. Use 3-15 letters, numbers, or underscores.`
      });
    }
    if (
      RESERVED_HANDLES.map((h) => h.toLowerCase()).includes(
        proposedHandle.toLowerCase()
      )
    ) {
      return res.status(200).send({
        available: false,
        message: `This username is not available. Please choose a different one.`
      });
    }
    const authenticatedHandle = maybeAuthenticatedWallet
      ? (
          await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
            maybeAuthenticatedWallet
          )
        )?.profile?.handle
      : null;
    if (proposedHandle.toLowerCase() !== authenticatedHandle?.toLowerCase()) {
      const profile =
        await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
          proposedHandle
        );
      if (profile) {
        return res.status(200).send({
          available: false,
          message: `This username is not available. Please choose a different one.`
        });
      }
    }
    res.status(200).send({
      available: true,
      message: 'Username is available.'
    });
  }
);

router.post(
  `/`,
  needsAuthenticatedUser(),
  async function (
    req: Request<any, any, ApiCreateOrUpdateProfileRequest, any, any>,
    res: Response<ApiResponse<ApiGetProfileResponse>>
  ) {
    const {
      handle,
      primary_wallet,
      banner_1,
      banner_2,
      website,
      classification
    } = getValidatedByJoiOrThrow(
      req.body,
      ApiCreateOrUpdateProfileRequestSchema
    );
    const createProfileCommand: CreateOrUpdateProfileCommand = {
      handle,
      primary_wallet: primary_wallet.toLowerCase(),
      banner_1,
      banner_2,
      website,
      creator_or_updater_wallet: getWalletOrThrow(req),
      classification
    };
    const profile = await profilesService.createOrUpdateProfile(
      createProfileCommand
    );
    const resp = await prepProfileApiResponse(profile, req);
    res.status(201).send(resp);
  }
);

router.post(
  `/:handleOrWallet/pfp`,
  needsAuthenticatedUser(),
  initMulterSingleMiddleware('pfp'),
  async function (
    req: Request<
      {
        handleOrWallet: string;
      },
      any,
      ApiUploadProfilePictureRequest,
      any,
      any
    >,
    res: Response<ApiResponse<{ pfp_url: string }>>
  ) {
    const authenticatedWallet = getWalletOrThrow(req);
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const { meme } = getValidatedByJoiOrThrow(
      req.body,
      ApiUploadProfilePictureRequestSchema
    );
    const file = req.file;
    const response = await profilesService.updateProfilePfp({
      authenticatedWallet,
      handleOrWallet,
      memeOrFile: { file, meme }
    });
    res.status(201).send(response);
  }
);

router.post(
  `/:handleOrWallet/cic/rating`,
  needsAuthenticatedUser(),
  async function (
    req: Request<
      {
        handleOrWallet: string;
      },
      any,
      ApiAddCicRatingToProfileRequest,
      any,
      any
    >,
    res: Response<ApiResponse<ApiGetProfileResponse>>
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const raterWallet = getWalletOrThrow(req);
    const { amount } = getValidatedByJoiOrThrow(
      req.body,
      ApiAddCicRatingToProfileRequestSchema
    );
    const targetProfile =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    if (!targetProfile?.profile) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    const raterProfile =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        raterWallet
      );
    if (!raterProfile?.profile) {
      throw new NotFoundException(
        `No profile found for authenticated used ${handleOrWallet}`
      );
    }
    const raterProfileId = raterProfile.profile.external_id;
    await cicRatingsService.updateProfileCicRating({
      raterProfileId: raterProfileId,
      targetProfileId: targetProfile.profile.external_id,
      cicRating: amount
    });
    const updatedProfileInfo =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    const resp = await prepProfileApiResponse(updatedProfileInfo!, req);
    res.status(201).send(resp);
  }
);

interface ApiCreateOrUpdateProfileRequest {
  readonly handle: string;
  readonly primary_wallet: string;
  readonly banner_1?: string;
  readonly banner_2?: string;
  readonly website?: string;
  readonly classification: ProfileClassification;
}

const ApiCreateOrUpdateProfileRequestSchema: Joi.ObjectSchema<ApiCreateOrUpdateProfileRequest> =
  Joi.object({
    handle: Joi.string()
      .min(3)
      .max(15)
      .regex(PROFILE_HANDLE_REGEX)
      .custom((value, helpers) => {
        const lowerCaseValue = value.toLowerCase();
        if (
          RESERVED_HANDLES.map((h) => h.toLowerCase()).includes(lowerCaseValue)
        ) {
          return helpers.message({
            custom: `This username is not available. Please choose a different one.`
          });
        }
        return value;
      })
      .required()
      .messages({
        'string.pattern.base': `Invalid username. Use 3-15 letters, numbers, or underscores.`
      }),
    primary_wallet: Joi.string().regex(WALLET_REGEX).required(),
    banner_1: Joi.string().optional(),
    banner_2: Joi.string().optional(),
    website: Joi.string().uri().optional().messages({
      'string.uri': `Please enter a valid website link, starting with 'http://' or 'https://'.`
    }),
    classification: Joi.string()
      .valid(...Object.values(ProfileClassification))
      .required()
  });

interface ApiUploadProfilePictureRequest {
  readonly meme?: number;
  readonly file?: Express.Multer.File;
}

const ApiUploadProfilePictureRequestSchema: Joi.ObjectSchema<ApiUploadProfilePictureRequest> =
  Joi.object({
    meme: Joi.number().optional()
  });

interface ApiAddCicRatingToProfileRequest {
  readonly amount: number;
}

const ApiAddCicRatingToProfileRequestSchema: Joi.ObjectSchema<ApiAddCicRatingToProfileRequest> =
  Joi.object({
    amount: Joi.number().integer().required()
  });

export default router;
