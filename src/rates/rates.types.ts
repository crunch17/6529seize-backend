import { RateMatter } from '../entities/IRating';

export interface AggregatedCicRating {
  cic_rating: number;
  contributor_count: number;
}

export interface ProfilesMatterRating {
  readonly rater_handle: string;
  readonly matter: RateMatter;
  readonly matter_category: string;
  readonly rating: number;
  readonly last_modified: Date;
}
