import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export class BaseTransaction {
  @Column({ type: 'datetime' })
  created_at!: Date;

  @Index()
  @PrimaryColumn({ type: 'varchar', length: 100 })
  transaction!: string;

  @Column({ type: 'int' })
  block!: number;

  @Column({ type: 'datetime' })
  transaction_date!: Date;

  @Index()
  @PrimaryColumn({ type: 'varchar', length: 50 })
  from_address!: string;

  @Index()
  @PrimaryColumn({ type: 'varchar', length: 50 })
  to_address!: string;

  @Index()
  @PrimaryColumn({ type: 'varchar', length: 50 })
  contract!: string;

  @Index()
  @PrimaryColumn({ type: 'bigint' })
  token_id!: number;

  @Column({ type: 'int' })
  token_count!: number;

  @Column({ type: 'double' })
  value!: number;

  @Column({ type: 'double' })
  primary_proceeds!: number;

  @Column({ type: 'double' })
  royalties!: number;

  @Column({ type: 'double' })
  gas_gwei!: number;

  @Column({ type: 'double' })
  gas_price!: number;

  @Column({ type: 'double' })
  gas_price_gwei!: number;

  @Column({ type: 'double' })
  gas!: number;

  @Column({ type: 'double', default: 0 })
  eth_price_usd!: number;

  @Column({ type: 'double', default: 0 })
  value_usd!: number;

  @Column({ type: 'double', default: 0 })
  gas_usd!: number;
}

@Entity('transactions')
export class Transaction extends BaseTransaction {}

export interface TransactionValue {
  transaction: string;
  value: number;
}
