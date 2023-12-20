import { asyncRouter } from '../async.router';
import { Request, Response } from 'express';
import { ApiResponse } from '../api-response';
import {
  CommunityMemberMinimal,
  profilesService
} from '../../../profiles/profiles.service';

const router = asyncRouter();

router.get(
  `/`,
  async function (
    req: Request<
      any,
      any,
      any,
      {
        param: string;
      },
      any
    >,
    res: Response<ApiResponse<CommunityMemberMinimal[]>>
  ) {
    const param = req.query.param?.toLowerCase();

    if (!param) {
      res.send([]);
    } else {
      const results =
        await profilesService.searchCommunityMemberMinimalsOfClosestMatches({
          param,
          limit: 10
        });
      res.send(results);
    }
  }
);

export default router;