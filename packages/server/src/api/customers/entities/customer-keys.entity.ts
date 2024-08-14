import { Workspaces } from '@/api/workspaces/entities/workspaces.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { AttributeType } from './attribute-type.entity';
import { AttributeParameter } from './attribute-parameter.entity';

@Entity()
export class CustomerKey {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  @Index()
  name: string;

  @JoinColumn()
  @ManyToOne(() => AttributeType, (type) => type.id, {
    onDelete: 'CASCADE',
  })
  attribute_type: AttributeType;

  @JoinColumn()
  @ManyToOne(() => AttributeType, (type) => type.id, {
    onDelete: 'CASCADE',
  })
  attribute_subtype: AttributeType;

  @JoinColumn()
  @ManyToOne(() => AttributeParameter, (parameter) => parameter.id, {
    onDelete: 'CASCADE',
  })
  attribute_parameter: AttributeParameter;

  @Column({ type: 'bool', nullable: false })
  is_primary: boolean;

  @JoinColumn()
  @ManyToOne(() => Workspaces, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  workspace: Workspaces;
}

