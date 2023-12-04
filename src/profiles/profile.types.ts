import { Profile, ProfileClassification } from '../entities/IProfile';
import { Wallet } from '../entities/IWallet';
import { AggregatedCicRating } from '../rates/rates.types';

export interface CreateOrUpdateProfileCommand {
  handle: string;
  primary_wallet: string;
  banner_1?: string;
  banner_2?: string;
  website?: string;
  creator_or_updater_wallet: string;
  classification: ProfileClassification;
}

export interface ProfileAndConsolidations {
  readonly profile: Profile | null;
  readonly consolidation: {
    wallets: { wallet: Wallet; tdh: number }[];
    tdh: number;
  };
  level: number;
  cic: AggregatedCicRating;
}