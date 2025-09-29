import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  callerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientId: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({
    type: process.env.NODE_ENV === 'test' || process.env.MINIMAL_DEV === 'true' 
      ? 'simple-json' 
      : 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any>;

  @CreateDateColumn({
    type: process.env.NODE_ENV === 'test' || process.env.MINIMAL_DEV === 'true'
      ? 'datetime' 
      : 'timestamp with time zone',
  })
  createdAt: Date;
}
