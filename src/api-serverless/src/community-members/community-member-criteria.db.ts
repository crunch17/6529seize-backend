import {
  ConnectionWrapper,
  dbSupplier,
  LazyDbAccessCompatibleService
} from '../../../sql-executor';
import { CommunityMembersCurationCriteriaEntity } from '../../../entities/ICommunityMembersCurationCriteriaEntity';
import { COMMUNITY_MEMBERS_CURATION_CRITERIA_TABLE } from '../../../constants';

type RawCriteriaEntity = Omit<
  CommunityMembersCurationCriteriaEntity,
  'criteria' | 'created_at'
> & { criteria: string; created_at: string };

export class CommunityMemberCriteriaDb extends LazyDbAccessCompatibleService {
  private toEntity(
    criteria: RawCriteriaEntity
  ): CommunityMembersCurationCriteriaEntity {
    return {
      ...criteria,
      criteria: JSON.parse(criteria.criteria),
      created_at: new Date(criteria.created_at)
    };
  }

  async save(
    entity: CommunityMembersCurationCriteriaEntity,
    connection: ConnectionWrapper<any>
  ) {
    await this.db.execute(
      `
      insert into ${COMMUNITY_MEMBERS_CURATION_CRITERIA_TABLE} (id, name, criteria, created_at, created_by, visible) values (:id, :name, :criteria, :created_at, :created_by, :visible)
    `,
      { ...entity, criteria: JSON.stringify(entity.criteria) },
      { wrappedConnection: connection }
    );
  }

  async getById(
    id: string,
    connection?: ConnectionWrapper<any>
  ): Promise<CommunityMembersCurationCriteriaEntity | null> {
    const opts = connection ? { wrappedConnection: connection } : undefined;
    return this.db
      .execute(
        `select * from ${COMMUNITY_MEMBERS_CURATION_CRITERIA_TABLE} where id = :id`,
        { id },
        opts
      )
      .then((res) => (res.length ? this.toEntity(res[0]) : null));
  }

  async changeCriteriaVisibility(
    id: string,
    visibility: boolean,
    connection: ConnectionWrapper<any>
  ) {
    await this.db.execute(
      `update ${COMMUNITY_MEMBERS_CURATION_CRITERIA_TABLE} set visible = :visible where id = :id`,
      { id, visible: visibility },
      { wrappedConnection: connection }
    );
  }

  async searchCriteria(
    curationCriteriaName: string | null,
    curationCriteriaUserId: string | null
  ): Promise<CommunityMembersCurationCriteriaEntity[]> {
    let sql = `select * from ${COMMUNITY_MEMBERS_CURATION_CRITERIA_TABLE} where true `;
    const params: Record<string, any> = {};
    if (curationCriteriaName) {
      sql += ` and name like :crit_name `;
      params.crit_name = `%${curationCriteriaName}%`;
    }
    if (curationCriteriaUserId) {
      sql += ` and created_by = :created_by `;
      params.created_by = curationCriteriaUserId;
    }
    sql += ` order by name limit 20`;
    return this.db.execute(sql, params).then((res) => res.map(this.toEntity));
  }
}

export const communityMemberCriteriaDb = new CommunityMemberCriteriaDb(
  dbSupplier
);
