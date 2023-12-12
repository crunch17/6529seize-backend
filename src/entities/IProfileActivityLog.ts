import { Column, Entity, PrimaryColumn } from 'typeorm';
import { PROFILES_ACTIVITY_LOGS_TABLE } from '../constants';

@Entity(PROFILES_ACTIVITY_LOGS_TABLE)
export class ProfileActivityLog {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  readonly id!: string;

  @Column({ type: 'varchar', length: 100 })
  readonly profile_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  readonly target_id!: string | null;

  @Column({ type: 'json' })
  readonly contents!: string;

  @Column({ type: 'varchar', length: 256 })
  readonly type!: ProfileActivityLogType;

  @Column({ type: 'datetime', nullable: true, default: null })
  readonly created_at!: Date;
}

export enum ProfileActivityLogType {
  RATING_EDIT = 'RATING_EDIT',
  HANDLE_EDIT = 'HANDLE_EDIT',
  PRIMARY_WALLET_EDIT = 'PRIMARY_WALLET_EDIT',
  CLASSIFICATION_EDIT = 'CLASSIFICATION_EDIT',
  SOCIALS_EDIT = 'SOCIALS_EDIT',
  CONTACTS_EDIT = 'CONTACTS_EDIT',
  SOCIAL_VERIFICATION_POST_EDIT = 'SOCIAL_VERIFICATION_POST_EDIT'
}
