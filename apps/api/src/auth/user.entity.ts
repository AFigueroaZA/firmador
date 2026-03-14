import type { UserRole } from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  fullName!: string;

  @Column({ type: 'varchar' })
  role!: UserRole;

  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
