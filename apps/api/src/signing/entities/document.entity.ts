import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'original_filename' })
  originalFileName!: string;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @Column({ name: 'sha256_hash', type: 'char', length: 64, nullable: true })
  sha256!: string | null;

  @Column()
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
