import { FullPageRequest } from '../page-request';

export interface CommunityMemberOverview {
  readonly display: string;
  readonly detail_view_key: string;
  readonly level: number;
  readonly tdh: number;
  readonly rep: number;
  readonly cic: number;
}

export enum CommunityMembersSortOption {
  DISPLAY = 'display',
  LEVEL = 'level',
  TDH = 'tdh',
  REP = 'rep',
  CIC = 'cic'
}

export type CommunityMembersQuery = FullPageRequest<CommunityMembersSortOption>;