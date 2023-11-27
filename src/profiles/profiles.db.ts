import {
  ConnectionWrapper,
  dbSupplier,
  LazyDbAccessCompatibleService
} from '../sql-executor';
import {
  CONSOLIDATED_WALLETS_TDH_TABLE,
  ENS_TABLE,
  MEMES_CONTRACT,
  NFTS_TABLE,
  PROFILES_ARCHIVE_TABLE,
  PROFILES_TABLE,
  WALLETS_TDH_TABLE
} from '../constants';
import { Wallet } from '../entities/IWallet';
import { Profile } from '../entities/IProfile';
import { DbPoolName } from '../db-query.options';
import { CreateOrUpdateProfileCommand } from './profile.types';
import { randomUUID } from 'crypto';

export class ProfilesDb extends LazyDbAccessCompatibleService {
  public async getConsolidationInfoForWallet(
    wallet: string
  ): Promise<{ tdh: number; wallets: string[]; blockNo: number }[]> {
    return this.db
      .execute(
        `SELECT block, boosted_tdh as tdh, wallets FROM ${CONSOLIDATED_WALLETS_TDH_TABLE} WHERE LOWER(consolidation_key) LIKE :wallet`,
        { wallet: `%${wallet.toLowerCase()}%` }
      )
      .then((result) =>
        result.map((it: { tdh: number; wallets: string; block: number }) => ({
          tdh: it.tdh,
          wallets: JSON.parse(it.wallets),
          blockNo: it.block
        }))
      );
  }

  public async getProfileIdsByWalletsNewestFirst(
    wallets: string[]
  ): Promise<string[]> {
    return this.db
      .execute(
        `select external_id from ${PROFILES_TABLE} where lower(primary_wallet) in (:wallets) order by created_at desc`,
        {
          wallets: wallets
        }
      )
      ?.then((result) =>
        result.map((it: { external_id: string }) => it.external_id)
      );
  }

  public async getPrimaryWalletByExternalId(
    external_id: string
  ): Promise<string | null> {
    return this.db
      .execute(
        `select primary_wallet from ${PROFILES_TABLE} where external_id = :externalId limit 1`,
        {
          externalId: external_id
        }
      )
      ?.then((result) => result.at(0)?.primary_wallet ?? null);
  }

  public async getPrediscoveredEnsNames(
    walletAddresses: string[]
  ): Promise<Wallet[]> {
    if (!walletAddresses.length) {
      return [];
    }
    const results: Wallet[] = await this.db.execute(
      `SELECT wallet as address, display as ens FROM ${ENS_TABLE} WHERE LOWER(wallet) IN (:walletAddresses)`,
      {
        walletAddresses: walletAddresses.map((walletAddress) =>
          walletAddress.toLowerCase()
        )
      }
    );
    return walletAddresses.map((walletAddress) => ({
      address: walletAddress,
      ens: results.find((row) => row.address === walletAddress)?.ens
    }));
  }

  public async getProfilesByWallets(wallets: string[]): Promise<Profile[]> {
    if (wallets.length === 0) {
      return [];
    }
    return this.db.execute(
      `select * from ${PROFILES_TABLE} where primary_wallet in (:wallets)`,
      { wallets: wallets.map((w) => w.toLowerCase()) },
      { forcePool: DbPoolName.WRITE }
    );
  }

  public async getWalletsTdhs({
    wallets,
    blockNo
  }: {
    wallets: string[];
    blockNo: number;
  }): Promise<Record<string, number>> {
    const normalisedWallets = wallets.map((w) => w.toLowerCase());
    if (!normalisedWallets.length) {
      return {};
    }
    const result: { wallet: string; tdh: number }[] = await this.db.execute(
      `select wallet, boosted_tdh as tdh from ${WALLETS_TDH_TABLE} where block = :blockNo and lower(wallet) in (:wallets)`,
      {
        blockNo,
        wallets: normalisedWallets
      }
    );
    return normalisedWallets.reduce(
      (acc: Record<string, number>, wallet: string) => {
        acc[wallet.toLowerCase()] =
          result.find((r) => r.wallet.toLowerCase() === wallet.toLowerCase())
            ?.tdh ?? 0;
        return acc;
      },
      {}
    );
  }

  public async getProfileByHandle(
    handle: string,
    connection?: ConnectionWrapper<any>
  ): Promise<Profile | null> {
    const result = await this.db.execute(
      `select * from ${PROFILES_TABLE} where normalised_handle = :handle`,
      { handle: handle.toLowerCase() },
      { forcePool: DbPoolName.WRITE, wrappedConnection: connection }
    );
    return result.at(0) ?? null;
  }

  private async insertProfileArchiveRecord(
    param: Profile,
    connection: ConnectionWrapper<any>
  ) {
    await this.db.execute(
      `insert into ${PROFILES_ARCHIVE_TABLE}
     (handle,
      normalised_handle,
      primary_wallet,
      created_at,
      created_by_wallet,
      banner_1,
      banner_2,
      website,
      classification,
      updated_at,
      updated_by_wallet,
      external_id)
     values (:handle,
             :normalisedHandle,
             :primaryWallet,
             :createdAt,
             :createdByWallet,
             :banner1,
             :banner2,
             :website,
             :classification,
             :updatedAt,
             :updatedByWallet,
             :externalId
             )`,
      {
        handle: param.handle,
        normalisedHandle: param.normalised_handle,
        primaryWallet: param.primary_wallet,
        createdAt: new Date(param.created_at),
        createdByWallet: param.created_by_wallet,
        updatedAt: param.updated_at ? new Date(param.updated_at) : null,
        updatedByWallet: param.updated_by_wallet,
        banner1: param.banner_1 ?? null,
        banner2: param.banner_2 ?? null,
        website: param.website ?? null,
        classification: param.classification,
        externalId: param.external_id!
      },
      { wrappedConnection: connection?.connection }
    );
  }

  public async updateProfileRecord({
    command,
    oldHandle
  }: {
    command: CreateOrUpdateProfileCommand;
    oldHandle: string;
  }) {
    await this.db.executeNativeQueriesInTransaction(async (connection) => {
      await this.db.execute(
        `update ${PROFILES_TABLE}
         set handle            = :handle,
             normalised_handle = :normalisedHandle,
             primary_wallet    = :primaryWallet,
             updated_at        = current_time,
             updated_by_wallet = :updatedByWallet,
             banner_1          = :banner1,
             banner_2          = :banner2,
             website           = :website,
             classification    = :classification
         where normalised_handle = :oldHandle`,
        {
          oldHandle,
          handle: command.handle,
          normalisedHandle: command.handle.toLowerCase(),
          primaryWallet: command.primary_wallet.toLowerCase(),
          updatedByWallet: command.creator_or_updater_wallet.toLowerCase(),
          banner1: command.banner_1 ?? null,
          banner2: command.banner_2 ?? null,
          website: command.website ?? null,
          classification: command.classification
        },
        { wrappedConnection: connection }
      );
      const profile = await this.getProfileByHandle(command.handle, connection);
      if (profile) {
        await this.insertProfileArchiveRecord(profile, connection);
      }
    });
  }

  public async insertProfileRecord({
    command
  }: {
    command: CreateOrUpdateProfileCommand;
  }) {
    await this.db.executeNativeQueriesInTransaction(async (connection) => {
      await this.db.execute(
        `insert into ${PROFILES_TABLE}
     (handle,
      normalised_handle,
      primary_wallet,
      created_at,
      created_by_wallet,
      banner_1,
      banner_2,
      website,
      classification,
      external_id)
     values (:handle,
             :normalisedHandle,
             :primaryWallet,
             current_time,
             :createdByWallet,
             :banner1,
             :banner2,
             :website,
             :classification,
             :externalId
             )`,
        {
          handle: command.handle,
          normalisedHandle: command.handle.toLowerCase(),
          primaryWallet: command.primary_wallet.toLowerCase(),
          createdByWallet: command.creator_or_updater_wallet.toLowerCase(),
          banner1: command.banner_1 ?? null,
          banner2: command.banner_2 ?? null,
          website: command.website ?? null,
          classification: command.classification,
          externalId: randomUUID()
        },
        { wrappedConnection: connection }
      );
      const profile = await this.getProfileByHandle(command.handle, connection);
      if (profile) {
        await this.insertProfileArchiveRecord(profile, connection);
      }
    });
  }

  public async getMemeThumbnailUriById(id: number): Promise<string | null> {
    const result = await this.db.execute(
      `select thumbnail from ${NFTS_TABLE} where id = :id and contract = :contract order by id asc limit 1`,
      {
        id,
        contract: MEMES_CONTRACT
      }
    );
    return result.at(0)?.thumbnail ?? null;
  }

  public async updateProfilePfpUri(thumbnailUri: string, profile: Profile) {
    await this.db.executeNativeQueriesInTransaction(async (connection) => {
      await this.db.execute(
        `update ${PROFILES_TABLE}
       set pfp_url = :pfp
       where normalised_handle = :handle`,
        {
          pfp: thumbnailUri,
          handle: profile.normalised_handle
        },
        { wrappedConnection: connection }
      );
      await this.getProfileByHandle(profile.handle, connection).then(
        async (it) => {
          if (it) {
            await this.insertProfileArchiveRecord(profile, connection);
          }
        }
      );
    });
  }
}

export const profilesDb = new ProfilesDb(dbSupplier);
