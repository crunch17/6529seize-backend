import {
  ConnectionWrapper,
  dbSupplier,
  LazyDbAccessCompatibleService
} from '../sql-executor';
import { RateMatter, Rating } from '../entities/IRating';
import {
  PROFILE_TDHS_TABLE,
  PROFILES_TABLE,
  RATINGS_TABLE
} from '../constants';
import { DbPoolName } from '../db-query.options';
import { Page, PageRequest } from '../api-serverless/src/page-request';
import { ProfilesMatterRating } from './rates.types';

export class RatingsDb extends LazyDbAccessCompatibleService {
  async getAggregatedRatingOnMatter({
    rater_profile_id,
    matter,
    matter_category,
    matter_target_id
  }: AggregatedRatingRequest): Promise<AggregatedRating> {
    let sql = `
    select sum(rating) as rating,
    count(distinct rater_profile_id) as contributor_count
    from ${RATINGS_TABLE}
    where 
      rating <> 0 and
      matter = :matter
      and matter_category = :matter_category
      and matter_target_id = :matter_target_id
  `;
    const params: Record<string, any> = {
      matter,
      matter_category,
      matter_target_id
    };
    if (rater_profile_id) {
      sql += ' and rater_profile_id = :rater_profile_id';
      params.rater_profile_id = rater_profile_id;
    }
    return this.db.execute(sql, params, { forcePool: DbPoolName.WRITE }).then(
      (results) =>
        results[0] ?? {
          rating: 0,
          contributor_count: 0
        }
    );
  }

  async searchRatingsForMatter({
    matter,
    matter_target_id,
    rater_profile_id,
    page_request,
    order_by,
    order
  }: RatingsSearchRequest): Promise<Page<ProfilesMatterRating>> {
    let sql = `
        with summed_cics as (select matter_target_id as profile_id, sum(rating) as cic_rating from ${RATINGS_TABLE} group by 1)
    select r.matter, r.matter_category, p.handle as rater_handle, r.rating, r.last_modified, case when sc.cic_rating is null then 0 else sc.cic_rating end as rater_cic_rating, p_tdh.boosted_tdh as rater_tdh from ${RATINGS_TABLE} r
      join ${PROFILES_TABLE} p on r.rater_profile_id = p.external_id
      join ${PROFILE_TDHS_TABLE} p_tdh on r.rater_profile_id = p_tdh.profile_id
      left join summed_cics sc on p.external_id = sc.profile_id
      where r.rating <> 0 and r.matter = :matter and r.matter_target_id = :matter_target_id`;
    let countSql = `select count(*) as cnt from ${RATINGS_TABLE} r
      join ${PROFILES_TABLE} p on r.rater_profile_id = p.external_id
      where r.rating <> 0 and r.matter = :matter and r.matter_target_id = :matter_target_id`;
    const params: Record<string, any> = { matter, matter_target_id };
    if (rater_profile_id) {
      params.rater_profile_id = rater_profile_id;
      sql += ' and r.rater_profile_id = :rater_profile_id';
      countSql += ' and r.rater_profile_id = :rater_profile_id';
    }
    const direction = order?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const orderBy =
      order_by?.toLowerCase() === 'rating' ? 'rating' : 'last_modified';
    sql += ` order by r.${orderBy} ${direction}`;
    const limit =
      page_request.page_size < 0 ? 0 : Math.min(page_request.page_size, 2000);
    const offset =
      page_request.page < 0
        ? 0
        : (page_request.page - 1) * page_request.page_size;
    sql += ` limit ${limit} offset ${offset}`;

    const [data, count] = await Promise.all([
      this.db.execute(sql, params),
      this.db.execute(countSql, params)
    ]);
    return {
      page: page_request.page,
      next: count > page_request.page_size * page_request.page,
      count: count[0]['cnt'],
      data
    };
  }

  async getRatingForUpdate(
    ratingLockRequest: UpdateRatingRequest,
    connection: ConnectionWrapper<any>
  ): Promise<Rating & { total_tdh_spent_on_matter: number }> {
    await this.db.execute(
      `
        insert into ${RATINGS_TABLE} (
                                      rater_profile_id,
                                      matter_target_id,
                                      matter, 
                                      matter_category, 
                                      rating,
                                      last_modified
        )
        values (:rater_profile_id, :matter_target_id, :matter, :matter_category, 0, current_time)
        on duplicate key update rater_profile_id = rater_profile_id
    `,
      ratingLockRequest,
      { wrappedConnection: connection }
    );
    const allRatesOnMatter: Rating[] = await this.db.execute(
      `
          select * from ${RATINGS_TABLE}
          where rater_profile_id = :rater_profile_id
            and matter = :matter
          for update
      `,
      ratingLockRequest,
      { wrappedConnection: connection }
    );
    const searchedMatter = allRatesOnMatter.find(
      (rate) =>
        rate.matter_category === ratingLockRequest.matter_category &&
        rate.matter_target_id === ratingLockRequest.matter_target_id
    )!;
    const total_tdh_spent_on_matter = allRatesOnMatter.reduce((acc, rate) => {
      return acc + Math.abs(rate.rating);
    }, 0);
    return {
      total_tdh_spent_on_matter,
      ...searchedMatter
    };
  }

  async updateRating(
    ratingUpdate: UpdateRatingRequest,
    connection: ConnectionWrapper<any>
  ) {
    await this.db.execute(
      `
          update ${RATINGS_TABLE}
          set rating = :rating,
              last_modified = current_time
          where rater_profile_id = :rater_profile_id
            and matter = :matter
            and matter_target_id = :matter_target_id
            and matter_category = :matter_category
      `,
      ratingUpdate,
      { wrappedConnection: connection }
    );
  }

  public async getOverRateMatters(): Promise<OverRateMatter[]> {
    return this.db.execute(
      `
          with rate_tallies as (select r.rater_profile_id,
                                       r.matter,
                                       sum(r.rating) as tally
                                from ${RATINGS_TABLE} r
                                group by 1, 2)
          select rt.rater_profile_id, rt.matter, rt.tally, pt.tdh as rater_tdh
          from rate_tallies rt
                   join ${PROFILE_TDHS_TABLE} pt on rt.rater_profile_id = pt.profile_id
          where pt.tdh < abs(rt.tally);
      `
    );
  }

  async getRatesSpentOnMatterByProfile(param: {
    profile_id: string;
    matter: RateMatter;
  }): Promise<number> {
    return this.db
      .execute(
        `select sum(abs(rating)) as rating from ${RATINGS_TABLE} where rater_profile_id = :profile_id and matter = :matter`,
        param
      )
      .then((results) => results[0]?.rating ?? 0);
  }

  async lockNonZeroRatingsNewerFirst(
    {
      rater_profile_id,
      page_request,
      matter
    }: {
      rater_profile_id: string;
      page_request: { page: number; page_size: number };
      matter: RateMatter;
    },
    connection: ConnectionWrapper<any>
  ): Promise<Rating[]> {
    if (page_request.page < 1 || page_request.page_size <= 0) {
      return [];
    }
    return this.db.execute(
      `select * from ${RATINGS_TABLE} where rater_profile_id = :rater_profile_id and matter = :matter and rating <> 0 order by last_modified desc limit :limit offset :offset for update`,
      {
        rater_profile_id,
        matter,
        offset: (page_request.page - 1) * page_request.page_size,
        limit: page_request.page_size
      },
      { wrappedConnection: connection }
    );
  }
}

export type UpdateRatingRequest = Omit<Rating, 'last_modified'>;

export interface OverRateMatter {
  rater_profile_id: string;
  matter: RateMatter;
  tally: number;
  rater_tdh: number;
}

export interface AggregatedRatingRequest {
  rater_profile_id: string | null;
  matter: string;
  matter_category: string;
  matter_target_id: string;
}

export interface AggregatedRating {
  rating: number;
  contributor_count: number;
}

export interface RatingsSearchRequest {
  matter: RateMatter;
  matter_target_id: string;
  rater_profile_id: string | null;
  page_request: PageRequest;
  order_by?: string;
  order?: string;
}

export const ratingsDb = new RatingsDb(dbSupplier);