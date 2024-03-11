import { loadEnv, unload } from '../secrets';
import { Profile, ProfileArchived } from '../entities/IProfile';
import { Logger } from '../logging';
import { CicStatement } from '../entities/ICICStatement';
import { ProfileActivityLog } from '../entities/IProfileActivityLog';
import { Rating } from '../entities/IRating';
import { ratingsService } from '../rates/ratings.service';
import { AbusivenessDetectionResult } from '../entities/IAbusivenessDetectionResult';
import * as sentryContext from '../sentry.context';
import {
  CommunityMemberView,
  ProfileFullView,
  WalletConsolidationKeyView
} from '../entities/ICommunityMember';
import { CommunityMembersCurationCriteriaEntity } from '../entities/ICommunityMembersCurationCriteriaEntity';

const logger = Logger.get('OVER_RATES_REVOCATION_LOOP');

export const handler = sentryContext.wrapLambdaHandler(async () => {
  logger.info(`[RUNNING]`);
  await loadEnv([
    Profile,
    ProfileArchived,
    CicStatement,
    ProfileActivityLog,
    Rating,
    AbusivenessDetectionResult,
    ProfileFullView,
    WalletConsolidationKeyView,
    CommunityMemberView,
    CommunityMembersCurationCriteriaEntity
  ]);
  await ratingsService.reduceOverRates();
  await unload();
  logger.info(`[COMPLETE]`);
});
