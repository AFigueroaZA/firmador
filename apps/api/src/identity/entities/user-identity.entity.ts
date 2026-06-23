import type { IdentityStatus } from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_identities')
export class UserIdentityEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  @Column({ type: 'varchar' })
  status!: IdentityStatus;

  @Column({ type: 'varchar', nullable: true })
  rut!: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombres!: string | null;

  @Column({ type: 'varchar', nullable: true })
  apellidoPaterno!: string | null;

  @Column({ type: 'varchar', nullable: true })
  apellidoMaterno!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', nullable: true })
  numeroDocumento!: string | null;

  @Column({ type: 'varchar', nullable: true })
  fechaNacimiento!: string | null;

  @Column({ type: 'varchar', nullable: true })
  estadoCivil!: string | null;

  @Column({ type: 'datetime', nullable: true })
  claveUnicaValidatedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  externalAuthState!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
