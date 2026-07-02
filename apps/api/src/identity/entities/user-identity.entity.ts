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
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'varchar' })
  status!: IdentityStatus;

  @Column({ type: 'varchar', nullable: true, unique: true })
  rut!: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombres!: string | null;

  @Column({ name: 'apellido_paterno', type: 'varchar', nullable: true })
  apellidoPaterno!: string | null;

  @Column({ name: 'apellido_materno', type: 'varchar', nullable: true })
  apellidoMaterno!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  telefono!: string | null;

  @Column({ name: 'numero_documento', type: 'varchar', nullable: true })
  numeroDocumento!: string | null;

  @Column({ name: 'fecha_nacimiento', type: 'varchar', nullable: true })
  fechaNacimiento!: string | null;

  @Column({ name: 'estado_civil', type: 'varchar', nullable: true })
  estadoCivil!: string | null;

  @Column({
    name: 'clave_unica_validated_at',
    type: 'timestamptz',
    nullable: true,
  })
  claveUnicaValidatedAt!: Date | null;

  @Column({ name: 'external_auth_state', type: 'varchar', nullable: true })
  externalAuthState!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
