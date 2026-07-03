import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('signature_assets')
export class SignatureAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'signing_process_id', type: 'uuid' })
  signingProcessId!: string;

  @Column({ name: 'asset_type' })
  assetType!: string;

  @Column({ name: 'page_number', type: 'integer' })
  pageNumber!: number;

  @Column({ type: 'numeric' })
  x!: number;

  @Column({ type: 'numeric' })
  y!: number;

  @Column({ type: 'numeric' })
  width!: number;

  @Column({ type: 'numeric' })
  height!: number;

  @Column({ type: 'text', nullable: true })
  label!: string | null;

  @Column({ name: 'image_storage_path', type: 'text', nullable: true })
  imageStoragePath!: string | null;

  @Column({ type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
