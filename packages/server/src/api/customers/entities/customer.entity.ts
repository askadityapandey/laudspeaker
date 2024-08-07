import { Workspaces } from '@/api/workspaces/entities/workspaces.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'customer' })
export class Customer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v7()', unique: true })
  @Index()
  uuid: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  user_attributes: any;

  @Column({ type: 'jsonb', default: {} })
  system_attributes: any;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  @Index()
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()', onUpdate: 'NOW()' })
  @Index()
  updated_at: Date;

  @JoinColumn()
  @ManyToOne(() => Workspaces, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  workspace: Workspaces;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  other_ids: string[];
}
