import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Step } from '../../steps/entities/step.entity';
import { Journey } from './journey.entity';
import { Workspaces } from '../../workspaces/entities/workspaces.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity()
export class JourneyLocation {
  @PrimaryColumn({ name: 'journeyId' })
  @ManyToOne(() => Journey, (journey) => journey.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyId' })
  public journey!: Journey;

  @PrimaryColumn({ name: 'customer_id' })
  @ManyToOne(() => Customer, (customer) => customer.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  public customer!: Customer;

  @JoinColumn()
  @ManyToOne(() => Step, (step) => step.id, { onDelete: 'CASCADE' })
  step!: Step;

  @JoinColumn()
  @ManyToOne(() => Workspaces, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  workspace!: Workspaces;

  // This is actually a timestamp using ECMAScript's native Date object; will yield
  // the same number across any timezone
  @Column({ type: 'bigint', nullable: false })
  stepEntry!: number;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  stepEntryAt!: Date;

  // This is actually a timestamp using ECMAScript's native Date object; will yield
  // the same number across any timezone
  @Column({ type: 'bigint', nullable: false, default: 0 })
  journeyEntry!: number;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  journeyEntryAt!: Date;

  // This is actually a timestamp using ECMAScript's native Date object; will yield
  // the same number across any timezone
  @Column({
    type: 'bigint',
    nullable: true,
  })
  moveStarted?: number | null;

  // This column is used to keep track of unique customers who've received a message
  // for a journey. Allows for rate limiting by customers receiving messages.
  @Column({
    type: 'boolean',
    nullable: true,
  })
  messageSent?: boolean | null;
}
