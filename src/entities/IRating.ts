import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RATINGS_TABLE } from '../constants';

@Entity(RATINGS_TABLE)
export class Rating {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  rater_profile_id!: string;
  @PrimaryColumn({ type: 'varchar', length: 50 })
  matter_target_id!: string;
  @PrimaryColumn({ type: 'varchar', length: 50 })
  matter!: RateMatter;
  @PrimaryColumn({ type: 'varchar', length: 100 })
  matter_category!: string;
  @Column({ type: 'int' })
  rating!: number;
  @Column({ type: 'timestamp' })
  last_modified!: Date;
}

export enum RateMatter {
  CIC = 'CIC'
}
