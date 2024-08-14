import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AttributeType } from './attribute-type.entity';

@Entity()
export class AttributeParameter {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  @Index()
  parameter: string;

  @JoinColumn()
  @OneToOne(() => AttributeType, (type) => type.id, {
    onDelete: 'CASCADE',
  })
  attribute_type: AttributeType;
}