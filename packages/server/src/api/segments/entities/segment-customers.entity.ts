import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Segment } from './segment.entity';
import { Workspaces } from '../../workspaces/entities/workspaces.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity()
export class SegmentCustomers extends BaseEntity {
  @PrimaryColumn({ name: 'segment_id' })
  @JoinColumn({ name: 'segment_id' })
  @ManyToOne(() => Segment, (segment) => segment.id, { onDelete: 'CASCADE' })
  public segment: Segment;

  @PrimaryColumn({ name: 'customer_id' })
  @JoinColumn({ name: 'customer_id' })
  @ManyToOne(() => Customer, (customer) => customer.id, { onDelete: 'CASCADE' })
  public customer: Customer;

  @JoinColumn({ name: 'workspace_id' })
  @ManyToOne(() => Workspaces, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  workspace: Workspaces;

  // This is actually a timestamp using ECMAScript's native Date object; will yield
  // the same number across any timezone
  @Column({ type: 'bigint', nullable: true, default: 0 })
  segmentEntry: number;
}
