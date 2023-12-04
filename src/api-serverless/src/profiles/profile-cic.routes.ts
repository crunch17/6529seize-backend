import { asyncRouter } from '../async.router';
import { getWalletOrThrow, needsAuthenticatedUser } from '../auth/auth';
import { Request, Response } from 'express';
import { ApiResponse } from '../api-response';
import { ProfileAndConsolidations } from '../../../profiles/profile.types';
import { getValidatedByJoiOrThrow } from '../validation';
import { profilesService } from '../../../profiles/profiles.service';
import { ForbiddenException, NotFoundException } from '../../../exceptions';
import { cicService } from '../../../rates/cic.service';
import * as Joi from 'joi';
import { CicStatement } from '../../../entities/ICICStatement';

const router = asyncRouter({ mergeParams: true });

function isAuthenticatedWalletProfileOwner(
  req: Request,
  profileAndConsolidations: ProfileAndConsolidations | null
) {
  const authenticatedWallet = getWalletOrThrow(req);
  return (
    profileAndConsolidations?.consolidation?.wallets?.find(
      (it) => it.wallet.address.toLowerCase() === authenticatedWallet
    ) ?? false
  );
}

router.get(
  `/rating/:raterHandleOrWallet`,
  async function (
    req: Request<
      {
        handleOrWallet: string;
        raterHandleOrWallet: string;
      },
      any,
      any,
      any,
      any
    >,
    res: Response<ApiResponse<ApiProfileRaterCicState>>
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const raterHandleOrWallet = req.params.raterHandleOrWallet.toLowerCase();
    const profileAndConsolidationsOfTarget =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    const targetProfile = profileAndConsolidationsOfTarget?.profile;
    const profileAndConsolidationsOfRater =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        raterHandleOrWallet
      );
    const raterProfile = profileAndConsolidationsOfRater?.profile;
    if (raterProfile && targetProfile) {
      const cicRatingByRater =
        await cicService.getProfilesAggregatedCicRatingForProfile(
          targetProfile.external_id,
          raterProfile.external_id
        );
      const cicRatingsLeftToGiveByRater =
        await cicService.getCicRatesLeftForProfile(raterProfile.external_id);
      res.send({
        cic_rating_by_rater: cicRatingByRater,
        cic_ratings_left_to_give_by_rater: cicRatingsLeftToGiveByRater
      });
    } else {
      res.send({
        cic_rating_by_rater: null,
        cic_ratings_left_to_give_by_rater: null
      });
    }
  }
);

router.post(
  `/rating`,
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
    res: Response<ApiResponse<ProfileAndConsolidations>>
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
    await cicService.updateProfileCicRating({
      raterProfileId: raterProfileId,
      targetProfileId: targetProfile.profile.external_id,
      cicRating: amount
    });
    const updatedProfileInfo =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    res.status(201).send(updatedProfileInfo!);
  }
);

router.get(
  `/statements`,
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
    res: Response<ApiResponse<CicStatement[]>>
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const profileAndConsolidations =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    const profileId = profileAndConsolidations?.profile?.external_id;
    if (!profileId) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    const statements = await cicService.getCicStatementsByProfileId(profileId);
    res.status(200).send(statements);
  }
);

router.get(
  `/statements/:statementId`,
  async function (
    req: Request<
      {
        handleOrWallet: string;
        statementId: string;
      },
      any,
      any,
      any,
      any
    >,
    res: Response<ApiResponse<CicStatement>>
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const statementId = req.params.statementId;
    const profileAndConsolidations =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    const profileId = profileAndConsolidations?.profile?.external_id;
    if (!profileId) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    const statement = await cicService.getCicStatementByIdAndProfileIDOrThrow({
      id: statementId,
      profile_id: profileId
    });
    res.status(200).send(statement);
  }
);

router.delete(
  `/statements/:statementId`,
  needsAuthenticatedUser(),
  async function (
    req: Request<
      {
        handleOrWallet: string;
        statementId: string;
      },
      any,
      any,
      any,
      any
    >,
    res: Response
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const profileAndConsolidations =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    if (!isAuthenticatedWalletProfileOwner(req, profileAndConsolidations)) {
      throw new ForbiddenException(
        `User can only add statements to its own profile`
      );
    }
    const statementId = req.params.statementId;
    const profileId = profileAndConsolidations?.profile?.external_id;
    if (!profileId) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    await cicService.deleteCicStatement({
      id: statementId,
      profile_id: profileId
    });
    res.status(201).send();
  }
);

router.post(
  `/statements/:statementId`,
  needsAuthenticatedUser(),
  async function (
    req: Request<
      {
        handleOrWallet: string;
        statementId: string;
      },
      any,
      ApiCreateOrUpdateProfileCicStatement,
      any,
      any
    >,
    res: Response
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const profileAndConsolidations =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    if (!isAuthenticatedWalletProfileOwner(req, profileAndConsolidations)) {
      throw new ForbiddenException(
        `User can only update statements of its own profile`
      );
    }
    const requestPayload = getValidatedByJoiOrThrow(
      req.body,
      ApiCreateOrUpdateProfileCicStatementSchema
    );
    const statementId = req.params.statementId;
    const profileId = profileAndConsolidations?.profile?.external_id;
    if (!profileId) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    const updatedStatement = await cicService.updateCicStatement({
      id: statementId,
      profile_id: profileId,
      ...requestPayload
    });
    res.status(201).send(updatedStatement);
  }
);

router.post(
  `/statements`,
  needsAuthenticatedUser(),
  async function (
    req: Request<
      {
        handleOrWallet: string;
      },
      any,
      ApiCreateOrUpdateProfileCicStatement,
      any,
      any
    >,
    res: Response
  ) {
    const handleOrWallet = req.params.handleOrWallet.toLowerCase();
    const profileAndConsolidations =
      await profilesService.getProfileAndConsolidationsByHandleOrEnsOrWalletAddress(
        handleOrWallet
      );
    if (!isAuthenticatedWalletProfileOwner(req, profileAndConsolidations)) {
      throw new ForbiddenException(
        `User can only add statements to its own profile`
      );
    }
    const requestPayload = getValidatedByJoiOrThrow(
      req.body,
      ApiCreateOrUpdateProfileCicStatementSchema
    );
    const profileId = profileAndConsolidations?.profile?.external_id;
    if (!profileId) {
      throw new NotFoundException(`No profile found for ${handleOrWallet}`);
    }
    const updatedStatement = await cicService.addCicStatement({
      profile_id: profileId,
      ...requestPayload
    });
    res.status(201).send(updatedStatement);
  }
);

interface ApiAddCicRatingToProfileRequest {
  readonly amount: number;
}

const ApiAddCicRatingToProfileRequestSchema: Joi.ObjectSchema<ApiAddCicRatingToProfileRequest> =
  Joi.object({
    amount: Joi.number().integer().required()
  });

type ApiCreateOrUpdateProfileCicStatement = Omit<
  CicStatement,
  'id' | 'crated_at' | 'updated_at' | 'profile_id'
>;

const ApiCreateOrUpdateProfileCicStatementSchema: Joi.ObjectSchema<ApiCreateOrUpdateProfileCicStatement> =
  Joi.object({
    statement_group: Joi.string().required().min(1).max(250),
    statement_type: Joi.string().required().min(1).max(250),
    statement_comment: Joi.optional().default(null),
    statement_value: Joi.string().min(1).required()
  });

interface ApiProfileRaterCicState {
  readonly cic_rating_by_rater: number | null;
  readonly cic_ratings_left_to_give_by_rater: number | null;
}

export default router;