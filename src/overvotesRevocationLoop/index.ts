import { loadEnv, unload } from '../secrets';
import * as votes from '../votes';
import { VoteMatterCategory } from '../entities/IVoteMatter';
import { VoteEvent } from '../entities/IVoteEvent';
import { TDH } from '../entities/ITDH';

export const handler = async () => {
  console.log(new Date(), '[RUNNING VOTE_REVOKE_LOOP]');
  await loadEnv([VoteMatterCategory, VoteEvent, TDH]);
  await votes.revokeOverVotes();
  await unload();
  console.log(new Date(), '[VOTE_REVOKE_LOOP COMPLETE]');
};