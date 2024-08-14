import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';


export enum AttributeTypeName {
  STRING = 'String',
  NUMBER = 'Number',
  BOOLEAN = 'Boolean',
  EMAIL = 'Email',
  DATE = 'Date',
  DATE_TIME = 'DateTime',
  ARRAY = 'Array',
  OBJECT = 'Object',
}

@Entity()
export class AttributeType {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;

    @Column({ type: 'text', nullable: false })
    @Index()
    name: AttributeTypeName;

    @Column({ type: 'bool', nullable: false })
    can_be_subtype: boolean;
}