import { loadEnv, unload } from '../secrets';
import { RateMatterCategory } from '../entities/IRateMatter';
import { RateEvent } from '../entities/IRateEvent';
import { Profile, ProfileArchived } from '../entities/IProfile';
import { Logger } from '../logging';
import { ratesService } from '../rates/rates.service';
import { CicRating } from '../entities/ICICRating';

const logger = Logger.get('OVER_RATES_REVOCATION_LOOP');

export const handler = async () => {
  logger.info(`[RUNNING]`);
  await loadEnv([
    RateMatterCategory,
    RateEvent,
    Profile,
    ProfileArchived,
    CicRating
  ]);
  await ratesService.revokeOverRates();
  await unload();
  logger.info(`[COMPLETE]`);
};
